import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Mama Afrika Kitchen', description: 'Restaurant display name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Authentic West African cuisine in the heart of Accra.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/cover.jpg' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiProperty({ example: '14 Oxford Street, Osu, Accra', description: 'Full street address' })
  @IsString()
  address: string;

  @ApiProperty({ example: 5.6037, description: 'Latitude coordinate (-90 to 90)' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: -0.187, description: 'Longitude coordinate (-180 to 180)' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: '+233244000000', description: 'Restaurant contact number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'info@mamaafrika.com', description: 'Restaurant contact email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 0.05, description: 'Platform commission rate (e.g. 0.05 = 5%)' })
  @IsOptional()
  @IsNumber()
  commissionRate?: number;

  @ApiPropertyOptional({ example: 5.0, description: 'Flat delivery fee charged to the customer' })
  @IsOptional()
  @IsNumber()
  deliveryFee?: number;

  @ApiPropertyOptional({ example: 30, description: 'Estimated delivery time in minutes' })
  @IsOptional()
  @IsNumber()
  estimatedMinutes?: number;

  @ApiPropertyOptional({ example: 'ACCT_xxxxxxxxxxxx', description: 'Paystack subaccount code for split payments' })
  @IsOptional()
  @IsString()
  paystackSubAccountCode?: string;
}
