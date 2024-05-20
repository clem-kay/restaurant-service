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
      'order status must be either PENDING or ACCEPTED or COOKING or COMPLETED ',
  })
  @ApiProperty({
    type: OrderStatus,
    description:
      'This is an optional property, will be set to default at the backend',
    enum: OrderStatus,
  })
  readonly food_status: OrderStatus = OrderStatus.PENDING;
  @IsOptional()
  @ApiProperty({
    type: Number,
    description:
      'This is an optional property, will be calculated at the backend if the frntedn do not add it',
  })
  readonly totalAmount: number;
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description:
      'This is a required property, the name of the person ordering the food',
  })
  readonly name: string;
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description:
      'This is a required property, the phone number of the person ordering the food',
  })
  readonly number: string;
  readonly location: string;
  readonly other_info: string;
  @IsEnum(PickUp_Status, {
    message: 'role must be either PENDING or ACCEPTED or COOKING or COMPLETED ',
  })
  @ApiProperty({
    type: String,
    description: 'This is a required property',
    enum: PickUp_Status,
  })
  readonly pickup_status: PickUp_Status;
}

export class OrderItemDto {
  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;

  @IsNumber()
  foodMenuId: number;
}

export class CreateOrderDto {
    @ValidateNested()
    @Type(() => OrderDto)
    @ApiProperty({ type: OrderDto })
    order: OrderDto;
  
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    @ApiProperty({ type: [OrderItemDto] })
    orderItems: OrderItemDto[];
  }