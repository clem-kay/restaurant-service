import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateDeliveryDto {
  @IsNumber() @ApiProperty() orderId: number;
  @IsNumber() @ApiProperty() riderId: number;
  @IsNumber() @IsOptional() @ApiProperty({ required: false }) pickupLat?: number;
  @IsNumber() @IsOptional() @ApiProperty({ required: false }) pickupLng?: number;
  @IsNumber() @IsOptional() @ApiProperty({ required: false }) dropoffLat?: number;
  @IsNumber() @IsOptional() @ApiProperty({ required: false }) dropoffLng?: number;
  @IsNumber() @IsOptional() @ApiProperty({ required: false }) riderEarning?: number;
}
