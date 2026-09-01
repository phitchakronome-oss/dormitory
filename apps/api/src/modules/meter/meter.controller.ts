import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { MeterService } from './meter.service';
import { RecordMeterDto, BatchMeterDto } from './dto/meter.dto';

@Controller('meters')
export class MeterController {
  constructor(private readonly meterService: MeterService) {}

  @Post()
  recordMeter(@Body() dto: RecordMeterDto) {
    return this.meterService.recordMeter(dto);
  }

  @Post('batch')
  batchRecordMeters(@Body() dto: BatchMeterDto) {
    return this.meterService.batchRecordMeters(dto);
  }

  @Get()
  getReadingsByMonth(
    @Query('month') billingMonth: string,
    @Query('buildingId') buildingId?: string,
  ) {
    const month = billingMonth || new Date().toISOString().slice(0, 7);
    return this.meterService.getReadingsByMonth(month, buildingId);
  }
}
