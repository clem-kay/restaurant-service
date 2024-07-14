import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description:
      'This is a required property, should be the name of the category',
  })
  readonly name: string;

  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description:
      'This is a required property, should be the description of the category',
  })
  readonly description: string;
}
