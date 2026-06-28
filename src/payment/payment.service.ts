import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { DeliveryService } from 'src/delivery/delivery.service';
import { TrackingGateway } from 'src/tracking/tracking.gateway';
import { FoodStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly paystackBase = 'https://api.paystack.co';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly deliveryService: DeliveryService,
    private readonly trackingGateway: TrackingGateway,
  ) {}

  // ─── Checkout ────────────────────────────────────────────────────────────

  async checkout(customerId: number, dto: CheckoutDto) {
    const { restaurantId, deliveryAddressId, items, paymentMethod, note } = dto;

    const [restaurant, address, menuItems] = await Promise.all([
      this.prisma.restaurant.findUnique({ where: { id: restaurantId } }),
      this.prisma.customerAddress.findUnique({ where: { id: deliveryAddressId } }),
      this.prisma.foodMenu.findMany({
        where: { id: { in: items.map((i) => i.foodMenuId) }, restaurantId, isAvailable: true },
      }),
    ]);

    if (!restaurant || !restaurant.isApproved || !restaurant.isOpen) {
      throw new BadRequestException('Restaurant is not available');
    }
    if (!address || address.customerId !== customerId) {
      throw new NotFoundException('Delivery address not found');
    }
    if (menuItems.length !== items.length) {
      throw new BadRequestException('One or more menu items are unavailable');
    }

    const subtotal = items.reduce((sum, item) => {
      const menu = menuItems.find((m) => m.id === item.foodMenuId);
      return sum + menu.price * item.quantity;
    }, 0);

    const deliveryFee = restaurant.deliveryFee;
    const totalAmount = subtotal + deliveryFee;
    const platformFee = parseFloat((totalAmount * restaurant.commissionRate).toFixed(2));
    const restaurantPayout = parseFloat((totalAmount - platformFee).toFixed(2));

    if (paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
      return this.createCodOrder({
        customerId, restaurantId, deliveryAddressId,
        items, note, totalAmount, deliveryFee, platformFee,
        restaurantPayout, restaurant, address,
      });
    }

    return this.initializePaystackPayment({
      customerId, restaurantId, deliveryAddressId,
      items, note, totalAmount, deliveryFee, platformFee,
      restaurantPayout, restaurant,
    });
  }

  // ─── Cash on Delivery ─────────────────────────────────────────────────────

  private async createCodOrder(data: any) {
    this.logger.log('Creating COD order');
    const order = await this.prisma.order.create({
      data: {
        restaurantId: data.restaurantId,
        customerId: data.customerId,
        deliveryAddressId: data.deliveryAddressId,
        note: data.note,
        totalAmount: data.totalAmount,
        deliveryFee: data.deliveryFee,
        platformFee: data.platformFee,
        restaurantPayout: data.restaurantPayout,
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        paymentStatus: PaymentStatus.COD_PENDING,
        foodStatus: FoodStatus.PENDING,
        orderItems: {
          create: data.items.map((item: any) => ({
            foodMenuId: item.foodMenuId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
        statusHistory: { create: { status: FoodStatus.PENDING } },
      },
      include: { orderItems: true, restaurant: { select: { name: true } } },
    });

    // Notify restaurant of new order via socket
    this.trackingGateway.notifyRestaurant(data.restaurantId, {
      event: 'order:new',
      orderId: order.id,
      paymentMethod: 'CASH_ON_DELIVERY',
      totalAmount: data.totalAmount,
    });

    this.logger.log(`COD order ${order.id} created`);
    return { orderId: order.id, paymentMethod: 'CASH_ON_DELIVERY' };
  }

  // ─── Paystack ─────────────────────────────────────────────────────────────

  private async initializePaystackPayment(data: any) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: data.customerId },
      include: { account: { include: { profile: true } } },
    });

    if (!customer) throw new BadRequestException('Customer not found');
    const email = customer.account.profile?.email;
    if (!email) throw new BadRequestException('Customer email required for Paystack');

    const amountInKobo = Math.round(data.totalAmount * 100);

    const metadata = {
      customerId: data.customerId,
      restaurantId: data.restaurantId,
      deliveryAddressId: data.deliveryAddressId,
      items: data.items,
      note: data.note,
      deliveryFee: data.deliveryFee,
      platformFee: data.platformFee,
      restaurantPayout: data.restaurantPayout,
    };

    try {
      const response = await axios.post(
        `${this.paystackBase}/transaction/initialize`,
        { email, amount: amountInKobo, metadata, currency: 'NGN' },
        { headers: { Authorization: `Bearer ${this.config.get('PAYSTACK_SECRET_KEY')}` } },
      );

      const { authorization_url, reference } = response.data.data;
      this.logger.log(`Paystack transaction initialized: ${reference}`);
      return { authorization_url, reference, paymentMethod: 'PAYSTACK' };
    } catch (err) {
      this.logger.error('Paystack initialization failed', err.response?.data);
      throw new BadRequestException('Payment initialization failed');
    }
  }

  // ─── Paystack Webhook ─────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string) {
    const secret = this.config.get<string>('PAYSTACK_SECRET_KEY');
    const hash = createHmac('sha512', secret).update(rawBody).digest('hex');

    if (hash !== signature) {
      this.logger.warn('Invalid Paystack webhook signature');
      throw new UnauthorizedException('Invalid signature');
    }

    const event = JSON.parse(rawBody.toString());
    this.logger.log(`Paystack webhook received: ${event.event}`);

    if (event.event === 'charge.success') {
      await this.handleChargeSuccess(event.data);
    }

    return { received: true };
  }

  private async handleChargeSuccess(data: any) {
    const { reference, metadata } = data;
    const {
      customerId, restaurantId, deliveryAddressId,
      items, note, deliveryFee, platformFee, restaurantPayout,
    } = metadata;

    // Idempotency — skip if already processed
    const existing = await this.prisma.order.findUnique({ where: { paystackReference: reference } });
    if (existing) return;

    const totalAmount = data.amount / 100;

    const order = await this.prisma.order.create({
      data: {
        restaurantId,
        customerId,
        deliveryAddressId,
        note,
        totalAmount,
        deliveryFee,
        platformFee,
        restaurantPayout,
        paymentMethod: PaymentMethod.PAYSTACK,
        paymentStatus: PaymentStatus.PAID,
        foodStatus: FoodStatus.PENDING,
        paystackReference: reference,
        orderItems: {
          create: items.map((item: any) => ({
            foodMenuId: item.foodMenuId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
        statusHistory: { create: { status: FoodStatus.PENDING } },
      },
      include: { restaurant: true },
    });

    this.logger.log(`Order ${order.id} created after Paystack payment`);

    this.trackingGateway.notifyRestaurant(restaurantId, {
      event: 'order:new',
      orderId: order.id,
      paymentMethod: 'PAYSTACK',
      totalAmount,
    });
  }

  // ─── Confirm COD Cash Received ────────────────────────────────────────────
  // Called by rider when customer hands over cash

  async confirmCashReceived(riderId: number, orderId: number) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { orderId },
      include: { order: true },
    });

    if (!delivery || delivery.riderId !== riderId) {
      throw new UnauthorizedException('Not your delivery');
    }
    if (delivery.order.paymentMethod !== PaymentMethod.CASH_ON_DELIVERY) {
      throw new BadRequestException('Not a COD order');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.PAID },
    });

    this.logger.log(`COD confirmed for order ${orderId}`);
    this.trackingGateway.notifyOrderRoom(orderId, 'payment:confirmed', { orderId });

    return { confirmed: true };
  }

  // ─── Paystack Transfer to Restaurant ─────────────────────────────────────

  async disbursePayout(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true },
    });

    if (!order.restaurant.paystackSubAccountCode) {
      this.logger.warn(`Restaurant ${order.restaurantId} has no Paystack subaccount — skipping payout`);
      return;
    }

    const amountInKobo = Math.round(order.restaurantPayout * 100);

    try {
      await axios.post(
        `${this.paystackBase}/transfer`,
        {
          source: 'balance',
          amount: amountInKobo,
          recipient: order.restaurant.paystackSubAccountCode,
          reason: `Payout for order #${orderId}`,
        },
        { headers: { Authorization: `Bearer ${this.config.get('PAYSTACK_SECRET_KEY')}` } },
      );
      this.logger.log(`Payout of ${order.restaurantPayout} sent to restaurant ${order.restaurantId}`);
    } catch (err) {
      this.logger.error('Payout failed', err.response?.data);
    }
  }
}
