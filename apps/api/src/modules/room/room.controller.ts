import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateBuildingDto, CreateRoomDto, UpdateRoomDto } from './dto/room.dto';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get('dashboard/stats')
  getDashboardStats() {
    return this.roomService.getDashboardStats();
  }

  @Post('buildings')
  createBuilding(@Body() dto: CreateBuildingDto) {
    return this.roomService.createBuilding(dto);
  }

  @Get('buildings')
  getAllBuildings() {
    return this.roomService.getAllBuildings();
  }

  @Post()
  createRoom(@Body() dto: CreateRoomDto) {
    return this.roomService.createRoom(dto);
  }

  @Get()
  getAllRooms(
    @Query('buildingId') buildingId?: string,
    @Query('status') status?: any,
  ) {
    return this.roomService.getAllRooms(buildingId, status);
  }

  @Get(':id')
  getRoomById(@Param('id') id: string) {
    return this.roomService.getRoomById(id);
  }

  @Put(':id')
  updateRoom(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.roomService.updateRoom(id, dto);
  }

  @Delete(':id')
  deleteRoom(@Param('id') id: string) {
    return this.roomService.deleteRoom(id);
  }
}
