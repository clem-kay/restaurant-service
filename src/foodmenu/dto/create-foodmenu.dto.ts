import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from "@nestjs/swagger";

export class CreateFoodmenuDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description: 'This is a required property, should be the name of the food you wish to add',
  })
  name: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({
    type: Number,
    description: 'This is a required property, should be the price of the food',
  })
  price: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiProperty({
    type: Number,
    description: 'This is a required property, should be the quantity of food',
  })
  quantity: number;

  @IsOptional()
  @ApiProperty({
    type: String,
    description: 'This is an optional property, should be the image URL. You can decide to upload the image somewhere or hit our image upload endpoint to get the URL',
  })
  imageUrl: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    type: String,
    description: 'This is an optional property, should provide some description of the food',
  })
  description: string;

  @IsNotEmpty()
  @ApiProperty({
    type: Number,
    description: 'This is a required property, should be the ID of the user creating or updating the menu item',
  })
  userAccountId: number; 

  @IsNotEmpty()
  @ApiProperty({
    type: Number,
    description: 'This is a required property, should be the ID of the food category the food belongs to',
  })
  categoryId: number; 
}
