import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class LoginDto {
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
  }
  