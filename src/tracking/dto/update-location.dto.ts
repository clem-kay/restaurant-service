import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class UpdateLocationDto {
  @IsNumber() @ApiProperty() lat: number;
  @IsNumber() @ApiProperty() lng: number;
}
