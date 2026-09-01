import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateTenantDto, CreateContractDto, UpdateContractDto } from './dto/tenant.dto';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  // Tenants
  async createTenant(dto: CreateTenantDto) {
    return this.prisma.tenant.create({ data: dto });
  }

  async getAllTenants() {
    return this.prisma.tenant.findMany({
      include: {
        contracts: {
          include: { room: { include: { building: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTenantById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        contracts: {
          include: { room: { include: { building: true } } },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  async updateTenant(id: string, dto: Partial<CreateTenantDto>) {
    await this.getTenantById(id);
    return this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTenant(id: string) {
    await this.getTenantById(id);
    return this.prisma.tenant.delete({ where: { id } });
  }

  // Contracts
  async createContract(dto: CreateContractDto) {
    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
    if (!room) throw new NotFoundException(`Room not found`);
    if (room.status === 'OCCUPIED') {
      throw new BadRequestException(`Room ${room.roomNumber} is already occupied`);
    }

    const count = await this.prisma.contract.count();
    const contractNumber = `CT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: {
          contractNumber,
          roomId: dto.roomId,
          tenantId: dto.tenantId,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          depositAmount: dto.depositAmount,
          advanceRentAmount: dto.advanceRentAmount,
          note: dto.note,
          status: 'ACTIVE',
        },
        include: { room: true, tenant: true },
      });

      // Update room status to OCCUPIED
      await tx.room.update({
        where: { id: dto.roomId },
        data: { status: 'OCCUPIED' },
      });

      return contract;
    });
  }

  async getAllContracts(status?: any) {
    const where: any = {};
    if (status) where.status = status;

    return this.prisma.contract.findMany({
      where,
      include: {
        room: { include: { building: true } },
        tenant: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateContract(id: string, dto: UpdateContractDto) {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) throw new NotFoundException(`Contract not found`);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.contract.update({
        where: { id },
        data: {
          ...(dto.status && { status: dto.status }),
          ...(dto.endDate && { endDate: new Date(dto.endDate) }),
          ...(dto.note !== undefined && { note: dto.note }),
        },
      });

      // If contract is terminated or expired, mark room as VACANT
      if (dto.status && dto.status !== 'ACTIVE') {
        await tx.room.update({
          where: { id: contract.roomId },
          data: { status: 'VACANT' },
        });
      }

      return updated;
    });
  }
}
