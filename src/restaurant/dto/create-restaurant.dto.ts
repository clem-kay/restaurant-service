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

  @ApiPropertyOptional({ example: 5.0, description: 'Flat delivery fee charged to the customer (in your currency)' })
  @IsOptional()
  @IsNumber()
  deliveryFee?: number;

  @ApiPropertyOptional({ example: 30, description: 'Estimated delivery time in minutes' })
  @IsOptional()
  @IsNumber()
  estimatedMinutes?: number;
}
