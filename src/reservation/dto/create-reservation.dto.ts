import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsDateString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ example: '2025-12-25', description: 'Date of the reservation (ISO 8601)' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: '19:00', description: 'Time slot (HH:MM, 24-hour format)' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 5)
  time: string;

  @ApiProperty({ example: 4, description: 'Number of guests' })
  @IsInt()
  @IsNotEmpty()
  numberOfGuests: number;

  @ApiProperty({ example: 'John Doe', description: 'Full name of the person making the reservation' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @ApiProperty({ example: '+233244000000', description: 'Contact phone number (10–15 digits)' })
  @IsString()
  @IsNotEmpty()
  @Length(10, 15)
  phone: string;
}

export class UpdateReservationDto {
  @ApiPropertyOptional({ example: '2025-12-26', description: 'Updated reservation date' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: '20:00', description: 'Updated time slot' })
  @IsString()
  @IsOptional()
  @Length(1, 5)
  time?: string;

  @ApiPropertyOptional({ example: 2, description: 'Updated guest count' })
  @IsInt()
  @IsOptional()
  numberOfGuests?: number;

  @ApiPropertyOptional({ example: 'Jane Doe', description: 'Updated name' })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ example: '+233244111111', description: 'Updated phone number' })
  @IsString()
  @IsOptional()
  @Length(10, 15)
  phone?: string;
}
