import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateBuildingDto, CreateRoomDto, UpdateRoomDto } from './dto/room.dto';

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

  // Buildings
  async createBuilding(dto: CreateBuildingDto) {
    return this.prisma.building.create({ data: dto });
  }

  async getAllBuildings() {
    return this.prisma.building.findMany({
      include: {
        rooms: {
          orderBy: { roomNumber: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // Rooms
  async createRoom(dto: CreateRoomDto) {
    const existing = await this.prisma.room.findUnique({
      where: {
        buildingId_roomNumber: {
          buildingId: dto.buildingId,
          roomNumber: dto.roomNumber,
        },
      },
    });
    if (existing) {
      throw new ConflictException(`Room ${dto.roomNumber} already exists in this building`);
    }

    return this.prisma.room.create({
      data: dto,
      include: { building: true },
    });
  }

  async getAllRooms(buildingId?: string, status?: any) {
    const where: any = {};
    if (buildingId) where.buildingId = buildingId;
    if (status) where.status = status;

    return this.prisma.room.findMany({
      where,
      include: {
        building: true,
        contracts: {
          where: { status: 'ACTIVE' },
          include: { tenant: true },
        },
      },
      orderBy: [{ buildingId: 'asc' }, { floor: 'asc' }, { roomNumber: 'asc' }],
    });
  }

  async getRoomById(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        building: true,
        contracts: {
          include: { tenant: true },
          orderBy: { createdAt: 'desc' },
        },
        meterReadings: {
          orderBy: { billingMonth: 'desc' },
          take: 6,
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 6,
        },
      },
    });
    if (!room) throw new NotFoundException(`Room with ID ${id} not found`);
    return room;
  }

  async updateRoom(id: string, dto: UpdateRoomDto) {
    await this.getRoomById(id);
    return this.prisma.room.update({
      where: { id },
      data: dto,
      include: { building: true },
    });
  }

  async deleteRoom(id: string) {
    await this.getRoomById(id);
    return this.prisma.room.delete({ where: { id } });
  }

  // Summary statistics for Dashboard
  async getDashboardStats() {
    const totalRooms = await this.prisma.room.count();
    const vacantRooms = await this.prisma.room.count({ where: { status: 'VACANT' } });
    const occupiedRooms = await this.prisma.room.count({ where: { status: 'OCCUPIED' } });
    const maintenanceRooms = await this.prisma.room.count({ where: { status: 'MAINTENANCE' } });
    const totalTenants = await this.prisma.tenant.count();

    const pendingInvoices = await this.prisma.invoice.findMany({
      where: { status: 'PENDING' },
      select: { totalAmount: true },
    });
    const pendingTotal = pendingInvoices.reduce((acc, curr) => acc + Number(curr.totalAmount), 0);

    return {
      totalRooms,
      vacantRooms,
      occupiedRooms,
      maintenanceRooms,
      totalTenants,
      pendingInvoicesCount: pendingInvoices.length,
      pendingTotalAmount: pendingTotal,
    };
  }
}
