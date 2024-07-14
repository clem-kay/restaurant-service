import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsNumber,
  Min,
  IsEnum,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, PickUp_Status } from 'src/enums/app.enum';
import { Type } from 'class-transformer';

export class OrderDto {
  @IsOptional()
  @IsEnum(OrderStatus, {
    message:
      'Order status must be either PENDING, ACCEPTED, COOKING, or COMPLETED',
  })
  @ApiProperty({
    type: String,
    description:
      'This is an optional property, will be set to default at the backend',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  readonly food_status: OrderStatus = OrderStatus.PENDING;

  @IsOptional()
  @IsNumber()
  @ApiProperty({
    type: Number,
    description:
      'This is an optional property, will be calculated at the backend if the frontend does not add it',
  })
  readonly totalAmount?: number;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    type: String,
    description:
      'This is a required property, the name of the person ordering the food',
  })
  readonly name: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    type: String,
    description:
      'This is a required property, the phone number of the person ordering the food',
  })
  readonly number: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    type: String,
    description:
      'This is an optional property, the location of the person ordering the food',
  })
  readonly location: string;

  @ApiProperty({
    example: 'ck@gmail.com',
    type: String,
    description: 'Client Email',
  })
  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    type: String,
    description:
      'This is an optional property, other information related to the order',
  })
  readonly other_info: string;

  @IsNotEmpty()
  @IsEnum(PickUp_Status, {
    message: 'Role must be either DINEIN or DELIVERY',
  })
  @ApiProperty({
    type: String,
    description: 'This is a required property',
    enum: PickUp_Status,
  })
  readonly pickup_status: PickUp_Status;
}

export class OrderItemDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    type: Number,
    description: 'This is a required property, the quantity of the item',
  })
  readonly quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    type: Number,
    description: 'This is a required property, the price of the item',
  })
  readonly price: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    type: Number,
    description: 'This is a required property, the ID of the food menu item',
  })
  readonly foodMenuId: number;
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => OrderDto)
  @ApiProperty({ type: OrderDto })
  readonly order: OrderDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ApiProperty({ type: [OrderItemDto] })
  readonly orderItems: OrderItemDto[];
}
