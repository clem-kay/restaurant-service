import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PickUp_Status } from 'src/enums/app.enum';

export class ClientOrderItemDto {
  @ApiProperty({
    example: 4,
    type: Number,
    description: 'Unique identifier for the order item',
  })
  @IsInt()
  id: number;

  @ApiProperty({
    example: '2024-07-13T09:08:50.569Z',
    type: String,
    description: 'Timestamp when the order item was created',
  })
  @IsString()
  createdAt: string;

  @ApiProperty({
    example: '2024-07-13T09:08:50.569Z',
    type: String,
    description: 'Timestamp when the order item was last updated',
  })
  @IsString()
  updatedAt: string;

  @ApiProperty({
    example: 'jollof',
    type: String,
    description: 'Name of the order item',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 25,
    type: Number,
    description: 'Price of the order item',
  })
  @IsInt()
  price: number;

  @ApiProperty({
    example: 'string',
    type: String,
    description: 'URL of the image of the order item',
  })
  @IsOptional()
  @IsString()
  imageUrl: string;

  @ApiProperty({
    example: 'this is the description',
    type: String,
    description: 'Description of the order item',
  })
  @IsString()
  description: string;

  @ApiProperty({
    example: 1,
    type: Number,
    description: 'Quantity of the order item',
  })
  @IsInt()
  quantity: number;

  @ApiProperty({
    example: 1,
    type: Number,
    description: 'ID of the user who ordered the item',
  })
  @IsInt()
  userAccountId: number;

  @ApiProperty({
    example: 1,
    type: Number,
    description: 'ID of the category the item belongs to',
  })
  @IsInt()
  categoryId: number;
}

export class ClientOrder {
  @ApiProperty({
    example: '1234',
    type: String,
    description: 'Postcode of the client',
  })
  @IsString()
  postCode: string;

  @ApiProperty({
    example: 'c30/4',
    type: String,
    description: 'Address of the client',
  })
  @IsString()
  clientAddress: string;

  @ApiProperty({
    example: 'Jake Koomson',
    type: String,
    description:
      'This is a required property, the name of the person ordering the food',
  })
  @IsString()
  clientName: string;

  @ApiProperty({
    example: 241929535,
    type: Number,
    description: 'Phone number of the client',
  })
  @IsString()
  phone: number;

  @ApiProperty({
    example: 'ck@gmail.com',
    type: String,
    description: 'Client Email',
  })
  @IsString()
  email: string;

  @ApiProperty({
    type: String,
    description: 'This is a required property',
    enum: PickUp_Status,
  })
  @IsOptional()
  readonly pickup_status: PickUp_Status;
}

export class ClientOrderDto {
  @ApiProperty({
    type: [ClientOrderItemDto],
    description: 'Array of order items',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientOrderItemDto)
  orderItems: ClientOrderItemDto[];

  @ApiProperty({
    type: ClientOrder,
    description: 'Details of the order',
  })
  @ValidateNested()
  @Type(() => ClientOrder)
  order: ClientOrder;
}
