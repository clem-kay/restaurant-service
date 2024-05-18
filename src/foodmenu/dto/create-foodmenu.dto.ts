
import { IsString, IsNotEmpty, IsOptional, IsUrl, IsNumber, Min } from 'class-validator';
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
    @IsOptional()
    @ApiProperty({
        type: String,
        description: 'This is an optional property, should be the image url, can decide to upload the image somewhere or hit our image upload endpoint to get the url',
      })
    imageUrl: string;
    @IsString()
    @IsNotEmpty()@IsOptional()
    @ApiProperty({
        type: String,
        description: 'This is an optional property, should some description of the food',
      })
    description: string;
    @IsNotEmpty()
    @ApiProperty({
        type: Number,
        description: 'This is an required property, should be the id of user creating or updating the menu item',
      })
    userAccountId: number; // Foreign key referencing UserAccount
}
