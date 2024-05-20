import { Injectable } from '@nestjs/common';
import { CreateOrderDto, OrderItemDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    const { order, orderItems } = createOrderDto;
    const totalAmount = orderItems.reduce((sum, item) => sum + item.price, 0);

    const createdOrder = await this.prisma.order.create({
      data: {
        ...order,
        food_status: 'Pending',
        totalAmount: totalAmount,
        orderItems: {
          create: orderItems.map((item) => ({
            quantity: item.quantity,
            price: item.price,
            foodMenuId: item.foodMenuId,
          })),
        },
      },
      include: {
        orderItems: true,
      },
    });
    return createdOrder;
  }

  async findAll() {
    return await this.prisma.order.findMany({});
  }

  async findOne(id: number) {
    return await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: true,
      },
    });
  }
  //To do this one
  update(id: number, updateOrderDto: UpdateOrderDto) {
    return `This action updates a #${id} order`;
  }

  async remove(id: number) {
    await this.prisma.order.delete({
      where: { id },
    });

    return `Order with id ${id} has been successfully deleted.`;
  }

  async updateFoodStated(id: number, status: string) {
    return await this.prisma.order.update({
      where: { id },
      data: {
        food_status: status,
      },
    });
  }
}
