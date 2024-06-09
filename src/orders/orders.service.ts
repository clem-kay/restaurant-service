import { Injectable } from '@nestjs/common';
import { CreateOrderDto, OrderItemDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderGateway } from './order.gateway';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private orderGateway: OrderGateway,
  ) {
  }

  async getTotalOrderToday() {
    const today = new Date(); // Get the current date

    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const endOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
    );

    const data = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startOfToday,
          lt: endOfToday,
        },
      },
    });
    return data;
  }

  async getTotalOrderPrevious() {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(startOfYesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const data = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startOfYesterday,
          lt: startOfToday,
        },
      },
    });
    return data;
  }

  async create(createOrderDto: CreateOrderDto) {
    const { order, orderItems } = createOrderDto;
    const totalAmount = orderItems.reduce((sum, item) => sum + item.price, 0);

    const createdOrder = await this.prisma.order.create({
      data: {
        ...order,
        food_status: 'PENDING',
        totalAmount: totalAmount,
        orderItems: {
          create: orderItems.map((item) => ({
            quantity: item.quantity,
            price: item.price,
            foodMenuId: item.foodMenuId,
          })),
        },
        statusHistory: {
          create: {
            status: 'PENDING',
            userAccountId: null,
          },
        },
      },
      include: {
        orderItems: true,
        statusHistory: true,
      },
    });
    this.orderGateway.notifyNewOrder(createOrderDto);
    return createdOrder;
  }

  async findAll() {
    return await this.prisma.order.findMany({});
  }

  async findOne(id: number) {
    return await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            foodMenu: true,
          },
        },
      },
    });
  }

  //To do this one
  update(id: number, updateOrderDto: UpdateOrderDto) {
    return `This action updates a #${id} order`;
  }

  async remove(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (order.food_status == 'PENDING' || order.food_status == 'Pending') {
      await this.prisma.order.delete({
        where: { id },
      });

      return { message: `Order with id ${id} has been successfully deleted.` };
    } else {
      return { message: 'Order is being prepared cannot be deleted' };
    }
  }

  async updateFoodStatus(id: number, body: { status: string; userId: number }) {
    return await this.prisma.order.update({
      where: { id },
      data: {
        food_status: body.status,
        statusHistory: {
          create: {
            status: body.status,
            userAccountId: body.userId,
          },
        },
      },
    });
  }

  async updatePayment(id: number, status: boolean) {
    return await this.prisma.order.update({
      where: { id },
      data: {
        paid: status,
      },
    });
  }
}
