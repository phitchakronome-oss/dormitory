import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';

export class GenerateInvoicesDto {
  @IsString()
  @IsNotEmpty()
  billingMonth: string; // e.g. "2026-09"

  @IsDateString()
  dueDate: string;

  @IsNumber()
  @IsOptional()
  commonFee?: number;
}

export class UpdateInvoiceStatusDto {
  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;

  @IsString()
  @IsOptional()
  note?: string;
}

export class RecordPaymentDto {
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @IsNumber()
  amount: number;

  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod;

  @IsString()
  @IsOptional()
  slipUrl?: string;

  @IsString()
  @IsOptional()
  receivedBy?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
