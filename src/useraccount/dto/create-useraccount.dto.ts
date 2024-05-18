import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

enum Role {
  SUPERADMIN = 'USER',
  ADMIN = 'ADMIN',
}

export class CreateUseraccountDto {
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description: 'This is a required property, should be an email',
  })
  readonly username: string;
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description: 'This is a required property, should be an email',
  })
  readonly password: string;
  @IsEnum(Role, {
    message: 'role must be either ADMIN or USER',
  })
  @ApiProperty({
    type: String,
    description: 'This is a required property',
    enum: Role,
  })
  readonly role: Role;
  @IsOptional()
  readonly hashRT: string;
}


