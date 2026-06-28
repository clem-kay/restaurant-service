import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateUseraccountDto {
  @IsNotEmpty()
  @ApiProperty({ example: 'john_doe', description: 'Unique username for the account' })
  readonly username: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'TempPass123!', description: 'Initial password set by admin — user should change on first login' })
  readonly password: string;

  @IsEnum(UserRole, { message: `Role must be one of: ${Object.values(UserRole).join(', ')}` })
  @ApiProperty({
    enum: UserRole,
    example: UserRole.RESTAURANT_ADMIN,
    description: 'Role determines which features the account can access',
  })
  readonly role: UserRole;

  @IsOptional()
  readonly hashRT?: string;
}
