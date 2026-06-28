import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod, PaymentStatus, FoodStatus } from '@prisma/client';
import axios from 'axios';

import { PaymentService } from './payment.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { DeliveryService } from 'src/delivery/delivery.service';
import { TrackingGateway } from 'src/tracking/tracking.gateway';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// We need to control createHmac to test webhook signature validation
const mockDigest = jest.fn();
const mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });
const mockCreateHmac = jest.fn().mockReturnValue({ update: mockUpdate });

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  createHmac: (...args: any[]) => mockCreateHmac(...args),
}));

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: jest.Mocked<PrismaService>;
  let config: jest.Mocked<ConfigService>;
  let trackingGateway: jest.Mocked<TrackingGateway>;

  const mockRestaurant = {
    id: 1,
    name: 'Test Restaurant',
    isApproved: true,
    isOpen: true,
    deliveryFee: 500,
    commissionRate: 0.1,
    paystackSubAccountCode: null,
    restaurantId: 1,
    latitude: 5.6037,
    longitude: -0.187,
  };

  const mockAddress = {
    id: 10,
    customerId: 42,
    address: '123 Main St',
    latitude: 5.61,
    longitude: -0.19,
  };

  const mockMenuItems = [
    { id: 101, restaurantId: 1, isAvailable: true, price: 1000 },
    { id: 102, restaurantId: 1, isAvailable: true, price: 1500 },
  ];

  const baseCheckoutDto = {
    restaurantId: 1,
    deliveryAddressId: 10,
    items: [
      { foodMenuId: 101, quantity: 2, price: 1000 },
      { foodMenuId: 102, quantity: 1, price: 1500 },
    ],
    paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
    note: 'Extra spicy',
  };

  beforeEach(async () => {
    const prismaMock = {
      restaurant: { findUnique: jest.fn() },
      customerAddress: { findUnique: jest.fn() },
      foodMenu: { findMany: jest.fn() },
      order: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      customer: { findUnique: jest.fn() },
      delivery: { findUnique: jest.fn() },
    };

    const trackingGatewayMock = {
      notifyRestaurant: jest.fn(),
      notifyOrderRoom: jest.fn(),
      notifyRider: jest.fn(),
    };

    const configMock = {
      get: jest.fn().mockReturnValue('test-paystack-secret'),
    };

    const deliveryServiceMock = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: configMock },
        { provide: DeliveryService, useValue: deliveryServiceMock },
        { provide: TrackingGateway, useValue: trackingGatewayMock },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prisma = module.get(PrismaService);
    config = module.get(ConfigService);
    trackingGateway = module.get(TrackingGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── checkout ─────────────────────────────────────────────────────────────

  describe('checkout', () => {
    describe('restaurant validation', () => {
      it('throws BadRequestException when restaurant is not found', async () => {
        (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.customerAddress.findUnique as jest.Mock).mockResolvedValue(mockAddress);
        (prisma.foodMenu.findMany as jest.Mock).mockResolvedValue(mockMenuItems);

        await expect(service.checkout(42, baseCheckoutDto)).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when restaurant is not approved', async () => {
        (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue({ ...mockRestaurant, isApproved: false });
        (prisma.customerAddress.findUnique as jest.Mock).mockResolvedValue(mockAddress);
        (prisma.foodMenu.findMany as jest.Mock).mockResolvedValue(mockMenuItems);

        await expect(service.checkout(42, baseCheckoutDto)).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when restaurant is not open', async () => {
        (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue({ ...mockRestaurant, isOpen: false });
        (prisma.customerAddress.findUnique as jest.Mock).mockResolvedValue(mockAddress);
        (prisma.foodMenu.findMany as jest.Mock).mockResolvedValue(mockMenuItems);

        await expect(service.checkout(42, baseCheckoutDto)).rejects.toThrow(BadRequestException);
      });
    });

    describe('address validation', () => {
      it('throws NotFoundException when address is not found', async () => {
        (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue(mockRestaurant);
        (prisma.customerAddress.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.foodMenu.findMany as jest.Mock).mockResolvedValue(mockMenuItems);

        await expect(service.checkout(42, baseCheckoutDto)).rejects.toThrow(NotFoundException);
      });

      it('throws NotFoundException when address belongs to a different customer', async () => {
        (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue(mockRestaurant);
        (prisma.customerAddress.findUnique as jest.Mock).mockResolvedValue({ ...mockAddress, customerId: 999 });
        (prisma.foodMenu.findMany as jest.Mock).mockResolvedValue(mockMenuItems);

        await expect(service.checkout(42, baseCheckoutDto)).rejects.toThrow(NotFoundException);
      });
    });

    describe('menu item validation', () => {
      it('throws BadRequestException when some menu items are unavailable', async () => {
        (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue(mockRestaurant);
        (prisma.customerAddress.findUnique as jest.Mock).mockResolvedValue(mockAddress);
        // Only 1 item returned instead of 2 — simulates unavailable item
        (prisma.foodMenu.findMany as jest.Mock).mockResolvedValue([mockMenuItems[0]]);

        await expect(service.checkout(42, baseCheckoutDto)).rejects.toThrow(BadRequestException);
      });
    });

    describe('CASH_ON_DELIVERY path', () => {
      it('calls createCodOrder and returns orderId and paymentMethod', async () => {
        (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue(mockRestaurant);
        (prisma.customerAddress.findUnique as jest.Mock).mockResolvedValue(mockAddress);
        (prisma.foodMenu.findMany as jest.Mock).mockResolvedValue(mockMenuItems);
        (prisma.order.create as jest.Mock).mockResolvedValue({
          id: 55,
          orderItems: [],
          restaurant: { name: 'Test Restaurant' },
        });

        const result = await service.checkout(42, {
          ...baseCheckoutDto,
          paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        });

        expect(prisma.order.create).toHaveBeenCalled();
        expect(result).toEqual({ orderId: 55, paymentMethod: 'CASH_ON_DELIVERY' });
      });
    });

    describe('PAYSTACK path', () => {
      it('calls initializePaystackPayment and returns authorization_url, reference, paymentMethod', async () => {
        (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue(mockRestaurant);
        (prisma.customerAddress.findUnique as jest.Mock).mockResolvedValue(mockAddress);
        (prisma.foodMenu.findMany as jest.Mock).mockResolvedValue(mockMenuItems);
        (prisma.customer.findUnique as jest.Mock).mockResolvedValue({
          id: 42,
          account: { profile: { email: 'customer@example.com' } },
        });
        mockedAxios.post.mockResolvedValue({
          data: { data: { authorization_url: 'https://paystack.com/pay/abc', reference: 'ref_123' } },
        });

        const result = await service.checkout(42, {
          ...baseCheckoutDto,
          paymentMethod: PaymentMethod.PAYSTACK,
        });

        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/transaction/initialize'),
          expect.objectContaining({ email: 'customer@example.com' }),
          expect.any(Object),
        );
        expect(result).toEqual({
          authorization_url: 'https://paystack.com/pay/abc',
          reference: 'ref_123',
          paymentMethod: 'PAYSTACK',
        });
      });
    });
  });

  // ─── createCodOrder (tested via COD checkout path) ────────────────────────

  describe('createCodOrder (via checkout)', () => {
    const setupCodCheckout = () => {
      (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue(mockRestaurant);
      (prisma.customerAddress.findUnique as jest.Mock).mockResolvedValue(mockAddress);
      (prisma.foodMenu.findMany as jest.Mock).mockResolvedValue(mockMenuItems);
      (prisma.order.create as jest.Mock).mockResolvedValue({
        id: 77,
        orderItems: [],
        restaurant: { name: 'Test Restaurant' },
      });
    };

    it('creates order with COD_PENDING paymentStatus', async () => {
      setupCodCheckout();

      await service.checkout(42, { ...baseCheckoutDto, paymentMethod: PaymentMethod.CASH_ON_DELIVERY });

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
            paymentStatus: PaymentStatus.COD_PENDING,
            foodStatus: FoodStatus.PENDING,
          }),
        }),
      );
    });

    it('calls trackingGateway.notifyRestaurant after creating order', async () => {
      setupCodCheckout();

      await service.checkout(42, { ...baseCheckoutDto, paymentMethod: PaymentMethod.CASH_ON_DELIVERY });

      expect(trackingGateway.notifyRestaurant).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ event: 'order:new', paymentMethod: 'CASH_ON_DELIVERY', orderId: 77 }),
      );
    });

    it('returns orderId and paymentMethod CASH_ON_DELIVERY', async () => {
      setupCodCheckout();

      const result = await service.checkout(42, {
        ...baseCheckoutDto,
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      });

      expect(result).toEqual({ orderId: 77, paymentMethod: 'CASH_ON_DELIVERY' });
    });
  });

  // ─── initializePaystackPayment (tested via PAYSTACK checkout path) ─────────

  describe('initializePaystackPayment (via checkout)', () => {
    const setupPaystackCheckout = () => {
      (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue(mockRestaurant);
      (prisma.customerAddress.findUnique as jest.Mock).mockResolvedValue(mockAddress);
      (prisma.foodMenu.findMany as jest.Mock).mockResolvedValue(mockMenuItems);
    };

    it('throws BadRequestException when customer is not found', async () => {
      setupPaystackCheckout();
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.checkout(42, { ...baseCheckoutDto, paymentMethod: PaymentMethod.PAYSTACK }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when customer has no email', async () => {
      setupPaystackCheckout();
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue({
        id: 42,
        account: { profile: { email: null } },
      });

      await expect(
        service.checkout(42, { ...baseCheckoutDto, paymentMethod: PaymentMethod.PAYSTACK }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when customer account has no profile', async () => {
      setupPaystackCheckout();
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue({
        id: 42,
        account: { profile: null },
      });

      await expect(
        service.checkout(42, { ...baseCheckoutDto, paymentMethod: PaymentMethod.PAYSTACK }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns authorization_url, reference, paymentMethod on axios success', async () => {
      setupPaystackCheckout();
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue({
        id: 42,
        account: { profile: { email: 'user@example.com' } },
      });
      mockedAxios.post.mockResolvedValue({
        data: { data: { authorization_url: 'https://paystack.com/pay/xyz', reference: 'ref_abc' } },
      });

      const result = await service.checkout(42, {
        ...baseCheckoutDto,
        paymentMethod: PaymentMethod.PAYSTACK,
      });

      expect(result).toEqual({
        authorization_url: 'https://paystack.com/pay/xyz',
        reference: 'ref_abc',
        paymentMethod: 'PAYSTACK',
      });
    });

    it('throws BadRequestException when axios.post fails', async () => {
      setupPaystackCheckout();
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue({
        id: 42,
        account: { profile: { email: 'user@example.com' } },
      });
      mockedAxios.post.mockRejectedValue({ response: { data: { message: 'error' } } });

      await expect(
        service.checkout(42, { ...baseCheckoutDto, paymentMethod: PaymentMethod.PAYSTACK }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── handleWebhook ─────────────────────────────────────────────────────────

  describe('handleWebhook', () => {
    const validSignature = 'valid-hash-hex';
    const makeRawBody = (event: string, data: object = {}) =>
      Buffer.from(JSON.stringify({ event, data }));

    beforeEach(() => {
      mockDigest.mockReturnValue(validSignature);
    });

    it('throws UnauthorizedException when signature is invalid', async () => {
      mockDigest.mockReturnValue('wrong-hash');

      const rawBody = makeRawBody('charge.success');
      await expect(service.handleWebhook(rawBody, validSignature)).rejects.toThrow(UnauthorizedException);
    });

    it('returns { received: true } when event is not charge.success', async () => {
      const rawBody = makeRawBody('transfer.success');

      const result = await service.handleWebhook(rawBody, validSignature);

      expect(result).toEqual({ received: true });
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('returns { received: true } without creating order when order already exists (idempotency)', async () => {
      const metadata = {
        customerId: 42,
        restaurantId: 1,
        deliveryAddressId: 10,
        items: [{ foodMenuId: 101, quantity: 1, price: 1000 }],
        note: null,
        deliveryFee: 500,
        platformFee: 150,
        restaurantPayout: 1350,
      };
      const rawBody = makeRawBody('charge.success', {
        reference: 'ref_existing',
        amount: 200000,
        metadata,
      });
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ id: 99 });

      const result = await service.handleWebhook(rawBody, validSignature);

      expect(result).toEqual({ received: true });
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('creates order and notifies restaurant for a new charge.success event', async () => {
      const metadata = {
        customerId: 42,
        restaurantId: 1,
        deliveryAddressId: 10,
        items: [{ foodMenuId: 101, quantity: 2, price: 1000 }],
        note: 'No onions',
        deliveryFee: 500,
        platformFee: 150,
        restaurantPayout: 1350,
      };
      const rawBody = makeRawBody('charge.success', {
        reference: 'ref_new',
        amount: 150000,
        metadata,
      });
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.order.create as jest.Mock).mockResolvedValue({
        id: 88,
        restaurant: { id: 1, name: 'Test Restaurant' },
      });

      const result = await service.handleWebhook(rawBody, validSignature);

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentMethod: PaymentMethod.PAYSTACK,
            paymentStatus: PaymentStatus.PAID,
            paystackReference: 'ref_new',
          }),
        }),
      );
      expect(trackingGateway.notifyRestaurant).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ event: 'order:new', orderId: 88, paymentMethod: 'PAYSTACK' }),
      );
      expect(result).toEqual({ received: true });
    });
  });

  // ─── confirmCashReceived ───────────────────────────────────────────────────

  describe('confirmCashReceived', () => {
    const riderId = 7;
    const orderId = 55;

    it('throws UnauthorizedException when delivery is not found', async () => {
      (prisma.delivery.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.confirmCashReceived(riderId, orderId)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when delivery belongs to a different rider', async () => {
      (prisma.delivery.findUnique as jest.Mock).mockResolvedValue({
        riderId: 999,
        order: { paymentMethod: PaymentMethod.CASH_ON_DELIVERY },
      });

      await expect(service.confirmCashReceived(riderId, orderId)).rejects.toThrow(UnauthorizedException);
    });

    it('throws BadRequestException when order is not a COD order', async () => {
      (prisma.delivery.findUnique as jest.Mock).mockResolvedValue({
        riderId,
        order: { paymentMethod: PaymentMethod.PAYSTACK },
      });

      await expect(service.confirmCashReceived(riderId, orderId)).rejects.toThrow(BadRequestException);
    });

    it('updates paymentStatus to PAID and emits payment:confirmed on success', async () => {
      (prisma.delivery.findUnique as jest.Mock).mockResolvedValue({
        riderId,
        order: { paymentMethod: PaymentMethod.CASH_ON_DELIVERY },
      });
      (prisma.order.update as jest.Mock).mockResolvedValue({ id: orderId });

      const result = await service.confirmCashReceived(riderId, orderId);

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.PAID },
      });
      expect(trackingGateway.notifyOrderRoom).toHaveBeenCalledWith(orderId, 'payment:confirmed', { orderId });
      expect(result).toEqual({ confirmed: true });
    });
  });

  // ─── disbursePayout ────────────────────────────────────────────────────────

  describe('disbursePayout', () => {
    const orderId = 55;

    it('logs a warning and returns undefined when restaurant has no paystackSubAccountCode', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: orderId,
        restaurantId: 1,
        restaurantPayout: 1350,
        restaurant: { paystackSubAccountCode: null },
      });

      const result = await service.disbursePayout(orderId);

      expect(result).toBeUndefined();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('sends a Paystack transfer when subaccount exists and axios succeeds', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: orderId,
        restaurantId: 1,
        restaurantPayout: 1350,
        restaurant: { paystackSubAccountCode: 'ACCT_abc123' },
      });
      mockedAxios.post.mockResolvedValue({ data: { status: true } });

      await service.disbursePayout(orderId);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/transfer'),
        expect.objectContaining({
          source: 'balance',
          amount: 135000,
          recipient: 'ACCT_abc123',
        }),
        expect.any(Object),
      );
    });

    it('logs an error and does not throw when axios.post fails', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: orderId,
        restaurantId: 1,
        restaurantPayout: 1350,
        restaurant: { paystackSubAccountCode: 'ACCT_abc123' },
      });
      mockedAxios.post.mockRejectedValue({ response: { data: { message: 'Transfer failed' } } });

      await expect(service.disbursePayout(orderId)).resolves.not.toThrow();
    });
  });
});
