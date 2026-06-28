import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFoodmenuDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Name of the food item' })
  name: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({ description: 'Price of the food item' })
  price: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Available quantity' })
  quantity?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Image URL of the food item' })
  imageUrl?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Short description of the food item' })
  description?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Whether the item is currently available', default: true })
  isAvailable?: boolean;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'ID of the food category this item belongs to' })
  categoryId: number;
}

export class UpdateFoodmenuDto extends CreateFoodmenuDto {}
