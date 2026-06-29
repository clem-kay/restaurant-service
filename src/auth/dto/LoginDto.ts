import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {

  @ApiProperty({
    type: String,
    description: 'This is a required property, should be an email',
  })
  @IsString()
  @IsNotEmpty()
  readonly username: string;

  @ApiProperty({
    type: String,
    description: 'This is a required property, should be an email',
  })
  @IsString()
  @IsNotEmpty()
  readonly password: string;
}

export class ChangePasswordDTO {
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description:
      'This is the username of the user who is changing the password',
  })
  readonly username: string;
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description:
      'This is the oldPassword of the user who is changing the password',
  })
  readonly oldPassword: string;
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description:
      'This is the new password of the user who is changing the password',
  })
  readonly newPassword: string;
}
