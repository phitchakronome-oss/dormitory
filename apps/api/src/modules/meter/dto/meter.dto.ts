import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

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

export class BatchMeterDto {
  @IsString()
  @IsNotEmpty()
  billingMonth: string;

  readings: {
    roomId: string;
    waterCurrUnit: number;
    electricityCurrUnit: number;
    waterUnitRate?: number;
    electricityUnitRate?: number;
  }[];
}
