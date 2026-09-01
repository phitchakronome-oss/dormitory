import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { RoomType, RoomStatus } from '@prisma/client';

export class CreateBuildingDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsOptional()
  totalFloors?: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  buildingId: string;

  @IsString()
  @IsNotEmpty()
  roomNumber: string;

  @IsNumber()
  floor: number;

  @IsEnum(RoomType)
  @IsOptional()
  type?: RoomType;

  @IsNumber()
  monthlyRent: number;

  @IsNumber()
  @IsOptional()
  deposit?: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateRoomDto {
  @IsEnum(RoomType)
  @IsOptional()
  type?: RoomType;

  @IsEnum(RoomStatus)
  @IsOptional()
  status?: RoomStatus;

  @IsNumber()
  @IsOptional()
  monthlyRent?: number;

  @IsNumber()
  @IsOptional()
  deposit?: number;

  @IsString()
  @IsOptional()
  description?: string;
}
