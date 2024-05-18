
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
enum Role {
  SUPERADMIN = 'SUPER-ADMIN',
  ADMIN = 'ADMIN',
}

export class CreateUserDto {

}

