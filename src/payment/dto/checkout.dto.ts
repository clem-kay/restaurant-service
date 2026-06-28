import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class OrderItemDto {
  @ApiProperty({ example: 3, description: 'ID of the food menu item' })
  @IsInt()
  foodMenuId: number;

  @ApiProperty({ example: 2, description: 'Quantity to order (minimum 1)' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 1500, description: 'Unit price in the smallest currency unit (e.g. pesewas/kobo)' })
  @IsInt()
  @Min(0)
  price: number;
}

export class CheckoutDto {
  @ApiProperty({ example: 1, description: 'ID of the restaurant to order from' })
  @IsInt()
  restaurantId: number;

  @ApiProperty({ example: 2, description: 'ID of the saved delivery address to deliver to' })
  @IsInt()
  deliveryAddressId: number;

  @ApiProperty({ type: [OrderItemDto], description: 'List of items in the order' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({
    enum: PaymentMethod,
    example: 'PAYSTACK',
    description: '`PAYSTACK` — redirects to payment page. `CASH_ON_DELIVERY` — order created immediately.',
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'Extra spicy please', description: 'Optional delivery or preparation note' })
  @IsOptional()
  @IsString()
  note?: string;
}
