import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { GenerateInvoicesDto, UpdateInvoiceStatusDto, RecordPaymentDto } from './dto/invoice.dto';

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  // Automatically generate monthly invoices for all occupied rooms
  async generateMonthlyInvoices(dto: GenerateInvoicesDto) {
    const contracts = await this.prisma.contract.findMany({
      where: { status: 'ACTIVE' },
      include: {
        room: true,
        tenant: true,
      },
    });

    if (contracts.length === 0) {
      throw new BadRequestException('No active contracts found to generate invoices');
    }

    const generatedInvoices = [];

    for (const contract of contracts) {
      // Find meter reading for this room & month
      const meter = await this.prisma.meterReading.findUnique({
        where: {
          roomId_billingMonth: {
            roomId: contract.roomId,
            billingMonth: dto.billingMonth,
          },
        },
      });

      const waterUnits = meter ? Math.max(0, meter.waterCurrUnit - meter.waterPrevUnit) : 0;
      const waterCost = meter ? waterUnits * Number(meter.waterUnitRate) : 0;

      const electricityUnits = meter ? Math.max(0, meter.electricityCurrUnit - meter.electricityPrevUnit) : 0;
      const electricityCost = meter ? electricityUnits * Number(meter.electricityUnitRate) : 0;

      const roomRent = Number(contract.room.monthlyRent);
      const commonFee = dto.commonFee || 0;
      const totalAmount = roomRent + waterCost + electricityCost + commonFee;

      const count = await this.prisma.invoice.count();
      const invoiceNumber = `INV-${dto.billingMonth.replace('-', '')}-${contract.room.roomNumber}-${String(count + 1).padStart(3, '0')}`;

      // Upsert invoice
      const invoice = await this.prisma.invoice.upsert({
        where: { invoiceNumber },
        create: {
          invoiceNumber,
          billingMonth: dto.billingMonth,
          contractId: contract.id,
          roomId: contract.roomId,
          tenantId: contract.tenantId,
          meterReadingId: meter ? meter.id : null,
          roomRent,
          waterUnits,
          waterCost,
          electricityUnits,
          electricityCost,
          commonFee,
          totalAmount,
          status: 'PENDING',
          dueDate: new Date(dto.dueDate),
        },
        update: {
          waterUnits,
          waterCost,
          electricityUnits,
          electricityCost,
          commonFee,
          totalAmount,
          dueDate: new Date(dto.dueDate),
        },
        include: {
          room: true,
          tenant: true,
          meterReading: true,
        },
      });

      generatedInvoices.push(invoice);
    }

    return generatedInvoices;
  }

  // Get invoices with filter
  async getAllInvoices(billingMonth?: string, status?: any) {
    const where: any = {};
    if (billingMonth) where.billingMonth = billingMonth;
    if (status) where.status = status;

    return this.prisma.invoice.findMany({
      where,
      include: {
        room: { include: { building: true } },
        tenant: true,
        meterReading: true,
        payments: true,
      },
      orderBy: [{ billingMonth: 'desc' }, { room: { roomNumber: 'asc' } }],
    });
  }

  // Get single invoice
  async getInvoiceById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        room: { include: { building: true } },
        tenant: true,
        meterReading: true,
        payments: true,
      },
    });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  // Update status
  async updateStatus(id: string, dto: UpdateInvoiceStatusDto) {
    await this.getInvoiceById(id);
    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: dto.status,
        note: dto.note,
        paidAt: dto.status === 'PAID' ? new Date() : null,
      },
    });
  }

  // Record payment
  async recordPayment(dto: RecordPaymentDto) {
    const invoice = await this.getInvoiceById(dto.invoiceId);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: dto.invoiceId,
          amount: dto.amount,
          method: dto.method || 'TRANSFER',
          slipUrl: dto.slipUrl,
          receivedBy: dto.receivedBy,
          note: dto.note,
        },
      });

      // Check if total payments >= invoice amount
      const allPayments = await tx.payment.findMany({
        where: { invoiceId: dto.invoiceId },
      });
      const paidTotal = allPayments.reduce((acc, curr) => acc + Number(curr.amount), 0);

      if (paidTotal >= Number(invoice.totalAmount)) {
        await tx.invoice.update({
          where: { id: dto.invoiceId },
          data: { status: 'PAID', paidAt: new Date() },
        });
      }

      return payment;
    });
  }
}
