import {
  IsString,
  IsInt,
  IsDateString,
  IsNotEmpty,
  Length,
} from 'class-validator';

export class CreateReservationDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 5)
  time: string;

  @IsInt()
  @IsNotEmpty()
  numberOfGuests: number;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 15)
  phone: string;
}

export class UpdateReservationDto {
  @IsDateString()
  date?: string;

  @IsString()
  @Length(1, 5)
  time?: string;

  @IsInt()
  numberOfGuests?: number;

  @IsString()
  @Length(1, 100)
  name?: string;

  @IsString()
  @Length(10, 15)
  phone?: string;
}
