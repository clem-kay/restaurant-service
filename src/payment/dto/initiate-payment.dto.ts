import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class InitiatePaymentDto {
  @IsNumber() @ApiProperty() orderId: number;
  @IsString() @IsOptional() @ApiProperty({ required: false }) email?: string;
}
