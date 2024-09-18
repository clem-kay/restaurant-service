import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClientOrderDto } from './dto/client-order.dto';
import { OrderStatus, PickUp_Status } from 'src/enums/app.enum';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private stripe: Stripe = new Stripe(process.env.STRIPE);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService:ConfigService
  ) {}

  async getDatePrefix(){
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2,'0');
    const year = String(date.getFullYear()).slice(-2);
    const formatedDate = month + year;

    return formatedDate;
  }

  async getTotalOrdersPreviousMonth() {
    this.logger.log('Fetching total orders for previous month');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    this.logger.debug(`Fetching records from ${startOfMonth} to ${endOfMonth}`);
    return this.getDataBetweenDates(startOfMonth, endOfMonth);
  }

  async getTotalOrderToday() {
    this.logger.log('Fetching total orders for today');
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    return this.getDataBetweenDates(startOfToday, endOfToday);
  }

  async getDataBetweenDates(start: Date, end: Date) {
    try {
      const data = await this.prisma.order.findMany({
        where: {
          createdAt: {
            gte: start,
            lt: end,
          },
        },
      });
      this.logger.log(`Successfully fetched total orders between ${start} and ${end}`);
      this.logger.debug(`Successfully fetched total orders: ${JSON.stringify(data)}`);
      return data;
    } catch (error) {
      this.logger.error('Failed to fetch total orders', error.stack);
      throw new ForbiddenException('Error occurred retrieving data');
    }
  }

  async getTotalOrderYesterday() {
    this.logger.log('Fetching total orders for yesterday');
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(startOfYesterday);
    endOfYesterday.setHours(23, 59, 59, 999);
    return this.getDataBetweenDates(startOfYesterday, startOfToday);
  }

  async createClientOrder(clientOrderDto: ClientOrderDto) {
    try {
      this.logger.log('Creating client order');
      const lineItems = clientOrderDto.orderItems.map((item) => ({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      }));

      const session = await this.stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: 'payment',
        payment_intent_data: {
          setup_future_usage: 'on_session',
        },
        customer_email: clientOrderDto.order.email,
        success_url: `${this.configService.get<string>('APPURL')}/api/v1/orders/pay/success/checkout/session?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.configService.get<string>('APPURL')}/api/v1/orders/pay/failed/checkout/session?session_id={CHECKOUT_SESSION_ID}`,
      });

      this.logger.log('Transforming client data to backend format');
      const transformedOrderItems = clientOrderDto.orderItems.map((item) => ({
        quantity: item.quantity,
        price: item.price,
        foodMenuId: item.id,
      }));

      const pickup = clientOrderDto.order.pickup_status || PickUp_Status.DELIVERY;

      const transformedOrder = {
        food_status: OrderStatus.PENDING,
        totalAmount: undefined,
        name: clientOrderDto.order.clientName,
        number: clientOrderDto.order.phone.toString(),
        location: clientOrderDto.order.clientAddress,
        other_info: '',
        pickup_status: pickup,
        email: clientOrderDto.order.email,
      };

      const order = {
        order: transformedOrder,
        orderItems: transformedOrderItems,
      };

      const createdOrder = await this.create(order);

      const sessionToBeStored = {
        orderId: createdOrder.id,
        sessionId: session.id,
      };

      this.logger.log(`Saving session ID for the order: ${JSON.stringify(sessionToBeStored)}`);
      const createdSessionId = await this.prisma.orderSessionId.create({
        data: sessionToBeStored,
      });
      const res ={ id: session.id } 
      this.logger.log(`Sending this session ID for the order to the frontend: ${JSON.stringify(res)}`);
      return res;

    } catch (error) {
      this.logger.error('Failed to create a new order', error.stack);
      throw new UnauthorizedException(error);
    }
  }

  async create(createOrderDto: CreateOrderDto) {
    const { order, orderItems } = createOrderDto;
    const totalAmount = orderItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );
    this.logger.log('Creating order in database');
    this.logger.debug(`Order data: ${JSON.stringify(order)}`);
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
      this.logger.log('Successfully created a new order');
      return {
        ...createdOrder,
        orderNumber: `${this.getDatePrefix()} + '/' + ${createdOrder.id.toString}`
      };
    } catch (error) {
      this.logger.error('Failed to create a new order', error.stack);
      throw new UnauthorizedException(error);
    }
  }

  async findAll(): Promise<any[]> {
    this.logger.log('Fetching all orders');
    try {
      const orders = await this.prisma.order.findMany({
        include: {
          orderItems: true,
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
        email: order.email,
        orderNumber: `${this.getDatePrefix()} + '/' + ${order.id.toString}`
      }));

      this.logger.log('Successfully fetched all orders');
      return ordersWithFoodCount;
    } catch (error) {
      this.logger.error('Failed to fetch all orders', error.stack);
      throw new UnauthorizedException(error);
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
      return { ...order,orderNumber: `${this.getDatePrefix()} + '/' + ${order.id.toString}`};
    } catch (error) {
      this.logger.error(`Failed to fetch order with ID: ${id}`, error.stack);
      throw new UnauthorizedException(error);
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
        return {
          message: `Order with ID: ${id} has been successfully deleted.`,
        };
      } else {
        this.logger.warn(`Order with ID: ${id} is being prepared and cannot be deleted`);
        return { message: 'Order is being prepared cannot be deleted' };
      }
    } catch (error) {
      this.logger.error(`Failed to delete order with ID: ${id}`, error.stack);
      throw new UnauthorizedException(error);
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
      throw new UnauthorizedException(error);
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
      throw new UnauthorizedException(error);
    }
  }

  async findTotalOrders() {
    this.logger.log('Getting all the orders from the database');
    try {
      const count = await this.prisma.order.count();
      this.logger.log(`Total number of orders: ${count}`);
      return count;
    } catch (error) {
      this.logger.error('Failed to count all orders', error.stack);
      throw new UnauthorizedException(error);
    }
  }

  async handleCheckoutSessionSuccess(sessionId: string) {
    this.logger.log(`Handling checkout session success for session ID: ${sessionId}`);
    try {
      const sessionOrderId = await this.prisma.orderSessionId.findFirst({
        where: { sessionId },
        select: { orderId: true, id: true }, // Select only the fields you need
      });

      if (sessionOrderId) {
        const updatedOrder = await this.updatePayment(sessionOrderId.orderId, true);
        if (updatedOrder) {
          return { message: 'success', error: '' };
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle checkout session success', error.stack);
      throw new UnauthorizedException(error);
    }
  }

  async handleCheckoutSessionFailed(sessionId: string) {
    this.logger.log(`Handling checkout session failed for session ID: ${sessionId}`);
    try {
      const sessionOrderId = await this.prisma.orderSessionId.findFirst({
        where: { sessionId },
        select: { orderId: true, id: true },
      });

      if (sessionOrderId) {
        const updatedOrder = await this.updatePayment(sessionOrderId.orderId, false);
        const updatedFoodStatus = await this.updateFoodStatus(sessionOrderId.orderId, { status: 'CANCELLED', userId: null });
        if (updatedOrder && updatedFoodStatus) {
          await this.prisma.orderSessionId.delete({
            where: { id: sessionOrderId.id },
          });
          this.logger.log(`Successfully handled checkout session failure for session ID: ${sessionId}`);
          return { message: 'success', error: '' };
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle checkout session failure', error.stack);
      throw new UnauthorizedException(error);
    }
  }
}