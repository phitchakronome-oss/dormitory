import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { GenerateInvoicesDto, UpdateInvoiceStatusDto, RecordPaymentDto } from './dto/invoice.dto';

@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('generate')
  generateMonthlyInvoices(@Body() dto: GenerateInvoicesDto) {
    return this.invoiceService.generateMonthlyInvoices(dto);
  }

  @Get()
  getAllInvoices(
    @Query('month') billingMonth?: string,
    @Query('status') status?: any,
  ) {
    return this.invoiceService.getAllInvoices(billingMonth, status);
  }

  @Get(':id')
  getInvoiceById(@Param('id') id: string) {
    return this.invoiceService.getInvoiceById(id);
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateInvoiceStatusDto) {
    return this.invoiceService.updateStatus(id, dto);
  }

  @Post('payments')
  recordPayment(@Body() dto: RecordPaymentDto) {
    return this.invoiceService.recordPayment(dto);
  }
}
