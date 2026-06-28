import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+233244000000' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class CreateAddressDto {
  @ApiProperty({ example: 'Home' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: '14 Oxford St, Accra' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 5.6037 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: -0.187 })
  @IsNumber()
  longitude: number;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateAddressDto extends CreateAddressDto {}

export class SubmitRatingDto {
  @ApiProperty({ example: 42 })
  @IsNumber()
  orderId: number;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  riderScore?: number;

  @ApiProperty({ example: 4, required: false })
  @IsOptional()
  @IsNumber()
  foodScore?: number;

  @ApiProperty({ example: 'Great food, fast delivery!', required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}
