import { Injectable, Logger } from '@nestjs/common';
import { CreateOrderDto, OrderItemDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderGateway } from './order.gateway';
import { ClientOrderDto } from './dto/client-order.dto';
import { OrderStatus, PickUp_Status } from 'src/enums/app.enum';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private orderGateway: OrderGateway,
  ) {}

  async getTotalOrderToday() {
    this.logger.log('Fetching total orders for today');
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

    try {
      const data = await this.prisma.order.findMany({
        where: {
          createdAt: {
            gte: startOfToday,
            lt: endOfToday,
          },
        },
      });
      this.logger.log('Successfully fetched total orders for today');
      return data;
    } catch (error) {
      this.logger.error('Failed to fetch total orders for today', error.stack);
      throw error;
    }
  }

  async getTotalOrderPrevious() {
    this.logger.log('Fetching total orders for yesterday');
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(startOfYesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    try {
      const data = await this.prisma.order.findMany({
        where: {
          createdAt: {
            gte: startOfYesterday,
            lt: startOfToday,
          },
        },
      });
      this.logger.log('Successfully fetched total orders for yesterday');
      return data;
    } catch (error) {
      this.logger.error('Failed to fetch total orders for yesterday', error.stack);
      throw error;
    }
  }

  createClientOrder(clientOrderDto: ClientOrderDto) {
    this.logger.log("Since the client side data is different we transform it to suit what we use at the backend")
    this.logger.log("and save what we want ")
    const transformedOrderItems = clientOrderDto.orderItems.map(item => ({
      quantity: item.quantity,
      price: item.price,
      foodMenuId: item.id,
    }));

    const pickup = clientOrderDto.order.pickup_status ? clientOrderDto.order.pickup_status : PickUp_Status.DELIVERY;
  
    const transformedOrder = {
      food_status: OrderStatus.PENDING,
      totalAmount: undefined,
      name: clientOrderDto.order.clientName,
      number: clientOrderDto.order.phone.toString(), 
      location: clientOrderDto.order.clientAddress,
      other_info: '', 
      pickup_status: pickup
    };
    
     const order = {
      order: transformedOrder,
      orderItems: transformedOrderItems,
    };

    return this.create(order)
  }

  async create(createOrderDto: CreateOrderDto) {
    const { order, orderItems } = createOrderDto;
    const totalAmount = orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    console.log(order)
    try {
      const createdOrder = await this.prisma.order.create({
        data: {
          ...order,
          food_status: OrderStatus.PENDING,
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
              status: OrderStatus.PENDING,
              userAccountId: null,
            },
          },
        },
        include: {
          orderItems: true,
          statusHistory: true,
        },
      });
      // this.orderGateway.notifyNewOrder(createdOrder);
      this.logger.log('Successfully created a new order');
      return createdOrder;
    } catch (error) {
      this.logger.error('Failed to create a new order', error.stack);
      throw error;
    }
  }

  async findAll(): Promise<any[]> {
    this.logger.log('Fetching all orders');
    try {
      const orders = await this.prisma.order.findMany({
        include: {
          orderItems: true, // Include orderItems to count them
        },
      });
      
      const ordersWithFoodCount = orders.map((order) => ({
        id: order.id,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        food_status: order.food_status,
        totalAmount: order.totalAmount,
        name: order.name,
        number: order.number,
        location: order.location,
        other_info: order.other_info,
        pickup_status: order.pickup_status,
        comment: order.comment,
        paid: order.paid,
        totalFoodItems: order.orderItems.length,
      }));

      this.logger.log('Successfully fetched all orders');
      return ordersWithFoodCount;
    } catch (error) {
      this.logger.error('Failed to fetch all orders', error.stack);
      throw error;
    }
  }

  async findOne(id: number) {
    this.logger.log(`Fetching order with ID: ${id}`);
    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
        include: {
          orderItems: {
            include: {
              foodMenu: true,
            },
          },
        },
      });
      this.logger.log(`Successfully fetched order with ID: ${id}`);
      return order;
    } catch (error) {
      this.logger.error(`Failed to fetch order with ID: ${id}`, error.stack);
      throw error;
    }
  }

  update(id: number, updateOrderDto: UpdateOrderDto) {
    this.logger.log(`Updating order with ID: ${id}`);
    // Implement your update logic here
    return `This action updates a #${id} order`;
  }

  async remove(id: number) {
    this.logger.log(`Deleting order with ID: ${id}`);
    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
      });

      if (order.food_status === 'PENDING' || order.food_status === 'Pending') {
        await this.prisma.order.delete({
          where: { id },
        });

        this.logger.log(`Successfully deleted order with ID: ${id}`);
        return { message: `Order with ID: ${id} has been successfully deleted.` };
      } else {
        this.logger.warn(`Order with ID: ${id} is being prepared and cannot be deleted`);
        return { message: 'Order is being prepared cannot be deleted' };
      }
    } catch (error) {
      this.logger.error(`Failed to delete order with ID: ${id}`, error.stack);
      throw error;
    }
  }

  async updateFoodStatus(id: number, body: { status: string; userId: number }) {
    this.logger.log(`Updating food status for order with ID: ${id} to ${body.status}`);
    try {
      const updatedOrder = await this.prisma.order.update({
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
      this.logger.log(`Successfully updated food status for order with ID: ${id}`);
      return updatedOrder;
    } catch (error) {
      this.logger.error(`Failed to update food status for order with ID: ${id}`, error.stack);
      throw error;
    }
  }

  async updatePayment(id: number, status: boolean) {
    this.logger.log(`Updating payment status for order with ID: ${id} to ${status}`);
    try {
      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          paid: status,
        },
      });
      this.logger.log(`Successfully updated payment status for order with ID: ${id}`);
      return updatedOrder;
    } catch (error) {
      this.logger.error(`Failed to update payment status for order with ID: ${id}`, error.stack);
      throw error;
    }
  }

  async findTotalOrders(){
    this.logger.log('Getting all the orders from the database')
    return await this.prisma.order.count()
  }
}
