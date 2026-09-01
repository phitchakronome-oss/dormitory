import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RecordMeterDto, BatchMeterDto } from './dto/meter.dto';

@Injectable()
export class MeterService {
  constructor(private prisma: PrismaService) {}

  // Get previous meter reading for a room
  async getPreviousReading(roomId: string, currentMonth: string) {
    return this.prisma.meterReading.findFirst({
      where: {
        roomId,
        billingMonth: { lt: currentMonth },
      },
      orderBy: { billingMonth: 'desc' },
    });
  }

  // Record single meter reading
  async recordMeter(dto: RecordMeterDto) {
    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
    if (!room) throw new NotFoundException('Room not found');

    const prev = await this.getPreviousReading(dto.roomId, dto.billingMonth);
    const waterPrevUnit = prev ? prev.waterCurrUnit : 0;
    const electricityPrevUnit = prev ? prev.electricityCurrUnit : 0;

    return this.prisma.meterReading.upsert({
      where: {
        roomId_billingMonth: {
          roomId: dto.roomId,
          billingMonth: dto.billingMonth,
        },
      },
      create: {
        roomId: dto.roomId,
        billingMonth: dto.billingMonth,
        waterPrevUnit,
        waterCurrUnit: dto.waterCurrUnit,
        waterUnitRate: dto.waterUnitRate,
        electricityPrevUnit,
        electricityCurrUnit: dto.electricityCurrUnit,
        electricityUnitRate: dto.electricityUnitRate,
        recordedBy: dto.recordedBy,
      },
      update: {
        waterCurrUnit: dto.waterCurrUnit,
        waterUnitRate: dto.waterUnitRate,
        electricityCurrUnit: dto.electricityCurrUnit,
        electricityUnitRate: dto.electricityUnitRate,
        recordedBy: dto.recordedBy,
      },
    });
  }

  // Batch record meters for all rooms in a month
  async batchRecordMeters(dto: BatchMeterDto) {
    const results = [];
    for (const item of dto.readings) {
      const prev = await this.getPreviousReading(item.roomId, dto.billingMonth);
      const res = await this.prisma.meterReading.upsert({
        where: {
          roomId_billingMonth: {
            roomId: item.roomId,
            billingMonth: dto.billingMonth,
          },
        },
        create: {
          roomId: item.roomId,
          billingMonth: dto.billingMonth,
          waterPrevUnit: prev ? prev.waterCurrUnit : 0,
          waterCurrUnit: item.waterCurrUnit,
          waterUnitRate: item.waterUnitRate || 18,
          electricityPrevUnit: prev ? prev.electricityCurrUnit : 0,
          electricityCurrUnit: item.electricityCurrUnit,
          electricityUnitRate: item.electricityUnitRate || 8,
        },
        update: {
          waterCurrUnit: item.waterCurrUnit,
          waterUnitRate: item.waterUnitRate || 18,
          electricityCurrUnit: item.electricityCurrUnit,
          electricityUnitRate: item.electricityUnitRate || 8,
        },
      });
      results.push(res);
    }
    return results;
  }

  // Get meter readings by month
  async getReadingsByMonth(billingMonth: string, buildingId?: string) {
    const rooms = await this.prisma.room.findMany({
      where: buildingId ? { buildingId } : undefined,
      include: {
        building: true,
        contracts: {
          where: { status: 'ACTIVE' },
          include: { tenant: true },
        },
        meterReadings: {
          where: { billingMonth },
        },
      },
      orderBy: [{ buildingId: 'asc' }, { floor: 'asc' }, { roomNumber: 'asc' }],
    });

    return rooms.map((room) => {
      const reading = room.meterReadings[0] || null;
      const tenant = room.contracts[0]?.tenant || null;
      return {
        room,
        tenant,
        reading,
      };
    });
  }
}
