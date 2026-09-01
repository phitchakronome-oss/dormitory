import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { RoomModule } from './modules/room/room.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { MeterModule } from './modules/meter/meter.module';
import { InvoiceModule } from './modules/invoice/invoice.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    RedisModule,
    RoomModule,
    TenantModule,
    MeterModule,
    InvoiceModule,
  ],
})
export class AppModule {}
