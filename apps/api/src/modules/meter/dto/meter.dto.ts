import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RecordMeterDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  billingMonth: string; // "2026-09"

  @IsNumber()
  waterCurrUnit: number;

  @IsNumber()
  waterUnitRate: number; // e.g. 18 Baht/unit

  @IsNumber()
  electricityCurrUnit: number;

  @IsNumber()
  electricityUnitRate: number; // e.g. 8 Baht/unit

  @IsString()
  @IsOptional()
  recordedBy?: string;
}

export class MeterReadingItemDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsNumber()
  waterCurrUnit: number;

  @IsNumber()
  electricityCurrUnit: number;

  @IsNumber()
  @IsOptional()
  waterUnitRate?: number;

  @IsNumber()
  @IsOptional()
  electricityUnitRate?: number;
}

export class BatchMeterDto {
  @IsString()
  @IsNotEmpty()
  billingMonth: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeterReadingItemDto)
  readings: MeterReadingItemDto[];
}
