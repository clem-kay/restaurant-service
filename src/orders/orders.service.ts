import { ForbiddenException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClientOrderDto } from './dto/client-order.dto';
import { OrderStatus, PickUp_Status } from 'src/enums/app.enum';
import { ConfigService } from '@nestjs/config';
import { FoodStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import Stripe from 'stripe';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { OrderWithFoodCount } from '.';

export interface OrderFilters {
  foodStatus?: FoodStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  restaurantId?: number;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private stripe: Stripe = new Stripe(process.env.STRIPE);
  private orderMap = new Map<string, CreateOrderDto>();

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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

      // Store order in map using session ID as the key
      this.orderMap.set(session.id, order);
      // const createdOrder = await this.create(order);

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
      // Legacy admin order creation — uses placeholder IDs until full migration
      const createdOrder = await this.prisma.order.create({
        data: {
          restaurantId: (order as any).restaurantId ?? 1,
          customerId: (order as any).customerId ?? 1,
          deliveryAddressId: (order as any).deliveryAddressId ?? 1,
          note: (order as any).other_info ?? (order as any).note,
          totalAmount,
          deliveryFee: 0,
          platformFee: 0,
          restaurantPayout: totalAmount,
          foodStatus: 'PENDING',
          paymentStatus: (order as any).paid ? 'PAID' : 'PENDING',
          orderItems: {
            create: orderItems.map((item) => ({
              quantity: item.quantity,
              price: item.price,
              foodMenuId: item.foodMenuId,
            })),
          },
          statusHistory: {
            create: { status: 'PENDING', userAccountId: null },
          },
        },
        include: { orderItems: true, statusHistory: true },
      });
      this.logger.log('Successfully created a new order');
      return { ...createdOrder, orderNumber: `${await this.getDatePrefix()}/${createdOrder.id}` };
    } catch (error) {
      this.logger.error('Failed to create a new order', error.stack);
      throw new UnauthorizedException(error);
    }
  }

  async findAll(page = 1, limit = 50, filters: OrderFilters = {}): Promise<any> {
    const skip = (page - 1) * limit;
    const filterKey = JSON.stringify(filters);
    const cacheKey = `allOrders:${page}:${limit}:${filterKey}`;
    this.logger.log(`Fetching orders page=${page} limit=${limit} filters=${filterKey}`);

    try {
      const cached = await this.cacheManager.get<any>(cacheKey);
      if (cached) {
        this.logger.log('Returning cached orders');
        return cached;
      }

      const where: any = {};
      if (filters.foodStatus)    where.foodStatus    = filters.foodStatus;
      if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
      if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
      if (filters.restaurantId)  where.restaurantId  = filters.restaurantId;

      const [orders, total] = await Promise.all([
        this.prisma.order.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            foodStatus: true,
            totalAmount: true,
            deliveryFee: true,
            paymentStatus: true,
            paymentMethod: true,
            restaurantId: true,
            _count: { select: { orderItems: true } },
          },
        }),
        this.prisma.order.count({ where }),
      ]);

      const result = {
        data: orders.map((o) => ({
          ...o,
          totalFoodItems: o._count.orderItems,
          orderNumber: `${o.id}`,
          _count: undefined,
        })),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };

      // Cache filtered results for 30 seconds — orders change frequently
      await this.cacheManager.set(cacheKey, result, 30_000);
      this.logger.log('Successfully fetched all orders');
      return result;
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
      return { ...order, orderNumber: `${order.id}` };
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

      if (order.foodStatus === 'PENDING') {
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
          foodStatus: body.status as any,
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
          paymentStatus: status ? 'PAID' : 'PENDING',
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
      this.logger.log(`Successfully updated payment status for order with ID: ${sessionId}`);
      const order = this.orderMap.get(sessionId)
      this.logger.log(`Successfully updated payment status for order with ${order}`);
      order.order.paid= true

      if (order) {
        const createdOrder = await this.create(order);
        const updatedOrder = await this.updatePayment(createdOrder.id, true);
        if (updatedOrder) {
          this.orderMap.delete(sessionId)
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
    // Legacy Stripe handler — superseded by Paystack webhook in payment.service.ts
    this.orderMap.delete(sessionId);
    return { message: 'success', error: '' };
  }
}