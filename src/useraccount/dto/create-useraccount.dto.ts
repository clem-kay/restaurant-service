import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

enum Role {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
  SALES = 'SALES'
}

export class CreateUseraccountDto {
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description: 'This is a required property, should be a username',
  })
  readonly username: string;

  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description:
      'This is a required property, should be a default password an admin set for the user',
  })
  readonly password: string;

  @IsEnum(Role, {
    message: 'Role must be either SUPERADMIN, ADMIN, USER, SALES',
  })
  @ApiProperty({
    type: String,
    description: 'This is a required property',
    enum: Role,
  })
  readonly role: Role;

  @IsOptional()
  readonly hashRT?: string;
}
