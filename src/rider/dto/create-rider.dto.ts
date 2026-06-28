import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { VehicleType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRiderDto {
  @ApiProperty({ example: 'James' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Mensah' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+233244111222' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ enum: VehicleType, example: VehicleType.MOTORCYCLE })
  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @ApiProperty({ example: 'GR-1234-22', required: false })
  @IsOptional()
  @IsString()
  vehiclePlate?: string;
}

export class UpdateRiderDto extends PartialType(CreateRiderDto) {}
