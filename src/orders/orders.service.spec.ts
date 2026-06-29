import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PickUp_Status, OrderStatus } from 'src/enums/app.enum';
import Stripe from 'stripe';

// ---------------------------------------------------------------------------
// Stripe mock — must be declared before any import that triggers its module
// ---------------------------------------------------------------------------
jest.mock('stripe', () => {
  const mockCreate = jest.fn();
  const MockStripe = jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mockCreate,
      },
    },
  }));
  (MockStripe as any).__mockCreate = mockCreate;
  return { __esModule: true, default: MockStripe };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockPrismaOrder = {
  findMany: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updateMany: jest.fn(),
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('http://localhost:3000'),
};

const mockPrismaService = {
  order: mockPrismaOrder,
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeCreatedOrder = (overrides: Partial<any> = {}) => ({
  id: 1,
  restaurantId: 1,
  customerId: 1,
  deliveryAddressId: 1,
  note: '',
  totalAmount: 20,
  deliveryFee: 0,
  platformFee: 0,
  restaurantPayout: 20,
  foodStatus: 'PENDING',
  paymentStatus: 'PENDING',
  orderItems: [],
  statusHistory: [],
  createdAt: new Date('2026-06-28T10:00:00.000Z'),
  updatedAt: new Date('2026-06-28T10:00:00.000Z'),
  ...overrides,
});

const makeOrderDto = (overrides: Partial<any> = {}) => ({
  order: {
    food_status: OrderStatus.PENDING,
    name: 'John Doe',
    number: '07777000000',
    location: '123 Street',
    other_info: '',
    pickup_status: PickUp_Status.DELIVERY,
    email: 'john@example.com',
    paid: false,
    ...overrides.order,
  },
  orderItems: [
    { quantity: 2, price: 10, foodMenuId: 5 },
    ...(overrides.orderItems ?? []),
  ],
  ...overrides,
});

const makeClientOrderDto = (overrides: Partial<any> = {}) => ({
  orderItems: [
    { id: 5, name: 'Jollof', price: 10, quantity: 2 },
    ...(overrides.orderItems ?? []),
  ],
  order: {
    postCode: 'SW1A 1AA',
    clientAddress: '10 Downing St',
    clientName: 'Jane Doe',
    phone: 7712345678,
    email: 'jane@example.com',
    pickup_status: PickUp_Status.DELIVERY,
    ...overrides.order,
  },
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('OrdersService', () => {
  let service: OrdersService;
  let stripeCheckoutCreate: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Grab the mocked Stripe checkout.sessions.create reference
    stripeCheckoutCreate = (Stripe as any).__mockCreate as jest.Mock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  // -------------------------------------------------------------------------
  // Basic wiring
  // -------------------------------------------------------------------------
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // getDatePrefix
  // =========================================================================
  describe('getDatePrefix', () => {
    it('returns a 4-character MMYY string', async () => {
      const result = await service.getDatePrefix();
      expect(result).toMatch(/^\d{4}$/);
    });

    it('returns the correct month and year', async () => {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      const result = await service.getDatePrefix();
      expect(result).toBe(`${month}${year}`);
    });
  });

  // =========================================================================
  // getDataBetweenDates
  // =========================================================================
  describe('getDataBetweenDates', () => {
    const start = new Date('2026-05-01');
    const end = new Date('2026-05-31');

    it('calls prisma.order.findMany with correct date range and returns data', async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      mockPrismaOrder.findMany.mockResolvedValueOnce(mockData);

      const result = await service.getDataBetweenDates(start, end);

      expect(mockPrismaOrder.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: { gte: start, lt: end },
        },
      });
      expect(result).toEqual(mockData);
    });

    it('throws ForbiddenException when prisma throws', async () => {
      mockPrismaOrder.findMany.mockRejectedValueOnce(new Error('DB error'));
      await expect(service.getDataBetweenDates(start, end)).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // getTotalOrdersPreviousMonth
  // =========================================================================
  describe('getTotalOrdersPreviousMonth', () => {
    it('delegates to getDataBetweenDates with last month range', async () => {
      const mockData = [{ id: 10 }];
      mockPrismaOrder.findMany.mockResolvedValueOnce(mockData);

      const result = await service.getTotalOrdersPreviousMonth();

      expect(mockPrismaOrder.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrismaOrder.findMany.mock.calls[0][0];
      const { gte, lt } = callArgs.where.createdAt;
      // start should be first day of previous month
      expect(gte.getDate()).toBe(1);
      // end should be day 0 of current month (last day of previous month)
      const now = new Date();
      expect(lt.getFullYear()).toBe(now.getFullYear());
      expect(result).toEqual(mockData);
    });
  });

  // =========================================================================
  // getTotalOrderToday
  // =========================================================================
  describe('getTotalOrderToday', () => {
    it('delegates to getDataBetweenDates with today range', async () => {
      const mockData = [{ id: 20 }];
      mockPrismaOrder.findMany.mockResolvedValueOnce(mockData);

      const result = await service.getTotalOrderToday();

      expect(mockPrismaOrder.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrismaOrder.findMany.mock.calls[0][0];
      const { gte, lt } = callArgs.where.createdAt;
      const today = new Date();
      expect(gte.getDate()).toBe(today.getDate());
      expect(lt.getDate()).toBe(today.getDate() + 1);
      expect(result).toEqual(mockData);
    });
  });

  // =========================================================================
  // getTotalOrderYesterday
  // =========================================================================
  describe('getTotalOrderYesterday', () => {
    it('delegates to getDataBetweenDates with yesterday range', async () => {
      const mockData = [{ id: 30 }];
      mockPrismaOrder.findMany.mockResolvedValueOnce(mockData);

      const result = await service.getTotalOrderYesterday();

      expect(mockPrismaOrder.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrismaOrder.findMany.mock.calls[0][0];
      const { gte, lt } = callArgs.where.createdAt;
      // gte = start of yesterday, lt = start of today
      expect(gte < lt).toBe(true);
      expect(result).toEqual(mockData);
    });
  });

  // =========================================================================
  // createClientOrder
  // =========================================================================
  describe('createClientOrder', () => {
    it('creates a Stripe session, stores the order in orderMap, and returns session id', async () => {
      const dto = makeClientOrderDto();
      stripeCheckoutCreate.mockResolvedValueOnce({ id: 'sess_abc123' });

      const result = await service.createClientOrder(dto as any);

      expect(stripeCheckoutCreate).toHaveBeenCalledTimes(1);
      const sessionArgs = stripeCheckoutCreate.mock.calls[0][0];
      expect(sessionArgs.mode).toBe('payment');
      expect(sessionArgs.customer_email).toBe(dto.order.email);
      expect(sessionArgs.line_items).toHaveLength(1);
      expect(sessionArgs.line_items[0].price_data.product_data.name).toBe('Jollof');
      expect(sessionArgs.line_items[0].quantity).toBe(2);
      expect(result).toEqual({ id: 'sess_abc123' });
    });

    it('maps orderItems to backend format including foodMenuId', async () => {
      const dto = makeClientOrderDto();
      stripeCheckoutCreate.mockResolvedValueOnce({ id: 'sess_xyz' });

      await service.createClientOrder(dto as any);

      // Verify the order stored in the map has the transformed structure
      const storedOrder = (service as any).orderMap.get('sess_xyz');
      expect(storedOrder).toBeDefined();
      expect(storedOrder.orderItems[0]).toMatchObject({
        quantity: 2,
        price: 10,
        foodMenuId: 5,
      });
    });

    it('uses DELIVERY as default pickup_status when not provided', async () => {
      const dto = makeClientOrderDto({ order: { pickup_status: undefined } });
      stripeCheckoutCreate.mockResolvedValueOnce({ id: 'sess_delivery' });

      await service.createClientOrder(dto as any);

      const storedOrder = (service as any).orderMap.get('sess_delivery');
      expect(storedOrder.order.pickup_status).toBe(PickUp_Status.DELIVERY);
    });

    it('throws UnauthorizedException when Stripe throws', async () => {
      const dto = makeClientOrderDto();
      stripeCheckoutCreate.mockRejectedValueOnce(new Error('Stripe error'));

      await expect(service.createClientOrder(dto as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // create
  // =========================================================================
  describe('create', () => {
    it('creates an order with orderItems and returns it with an orderNumber', async () => {
      const dto = makeOrderDto();
      const created = makeCreatedOrder({ totalAmount: 20 });
      mockPrismaOrder.create.mockResolvedValueOnce(created);

      const result = await service.create(dto as any);

      expect(mockPrismaOrder.create).toHaveBeenCalledTimes(1);
      const createArg = mockPrismaOrder.create.mock.calls[0][0];
      expect(createArg.data.totalAmount).toBe(20); // 2 * 10
      expect(createArg.data.orderItems.create).toHaveLength(1);
      expect(createArg.data.orderItems.create[0]).toMatchObject({
        quantity: 2,
        price: 10,
        foodMenuId: 5,
      });
      expect(createArg.data.statusHistory.create).toMatchObject({ status: 'PENDING' });
      expect(result.id).toBe(1);
      expect(result.orderNumber).toMatch(/^\d{4}\/1$/);
    });

    it('sets paymentStatus to PAID when order.paid is true', async () => {
      const dto = makeOrderDto({ order: { paid: true } });
      mockPrismaOrder.create.mockResolvedValueOnce(makeCreatedOrder({ paymentStatus: 'PAID' }));

      await service.create(dto as any);

      const createArg = mockPrismaOrder.create.mock.calls[0][0];
      expect(createArg.data.paymentStatus).toBe('PAID');
    });

    it('throws UnauthorizedException when prisma.create throws', async () => {
      const dto = makeOrderDto();
      mockPrismaOrder.create.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.create(dto as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // findAll
  // =========================================================================
  describe('findAll', () => {
    const mockOrders = [
      {
        id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        foodStatus: 'PENDING',
        totalAmount: 20,
        deliveryFee: 0,
        paymentStatus: 'PENDING',
        paymentMethod: 'CASH',
        restaurantId: 1,
        _count: { orderItems: 2 },
      },
    ];
    const mockTotal = 1;

    describe('cache hit path', () => {
      it('returns cached data without calling prisma', async () => {
        const cachedResult = { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } };
        mockCacheManager.get.mockResolvedValueOnce(cachedResult);

        const result = await service.findAll(1, 50, {});

        expect(mockCacheManager.get).toHaveBeenCalledWith('allOrders:1:50:{}');
        expect(mockPrismaOrder.findMany).not.toHaveBeenCalled();
        expect(mockPrismaOrder.count).not.toHaveBeenCalled();
        expect(result).toEqual(cachedResult);
      });
    });

    describe('cache miss path', () => {
      beforeEach(() => {
        mockCacheManager.get.mockResolvedValue(null);
        mockPrismaOrder.findMany.mockResolvedValue(mockOrders);
        mockPrismaOrder.count.mockResolvedValue(mockTotal);
        mockCacheManager.set.mockResolvedValue(undefined);
      });

      it('calls prisma with empty where when no filters', async () => {
        const result = await service.findAll(1, 50, {});

        expect(mockPrismaOrder.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {},
            skip: 0,
            take: 50,
            orderBy: { createdAt: 'desc' },
          }),
        );
        expect(mockPrismaOrder.count).toHaveBeenCalledWith({ where: {} });
        expect(result.total).toBe(1);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(50);
        expect(result.totalPages).toBe(1);
        expect(result.data[0].totalFoodItems).toBe(2);
        expect(result.data[0]._count).toBeUndefined();
      });

      it('applies foodStatus filter', async () => {
        await service.findAll(1, 50, { foodStatus: 'PENDING' as any });

        const callArg = mockPrismaOrder.findMany.mock.calls[0][0];
        expect(callArg.where.foodStatus).toBe('PENDING');
      });

      it('applies paymentStatus filter', async () => {
        await service.findAll(1, 50, { paymentStatus: 'PAID' as any });

        const callArg = mockPrismaOrder.findMany.mock.calls[0][0];
        expect(callArg.where.paymentStatus).toBe('PAID');
      });

      it('applies paymentMethod filter', async () => {
        await service.findAll(1, 50, { paymentMethod: 'CARD' as any });

        const callArg = mockPrismaOrder.findMany.mock.calls[0][0];
        expect(callArg.where.paymentMethod).toBe('CARD');
      });

      it('applies restaurantId filter', async () => {
        await service.findAll(1, 50, { restaurantId: 7 });

        const callArg = mockPrismaOrder.findMany.mock.calls[0][0];
        expect(callArg.where.restaurantId).toBe(7);
      });

      it('applies multiple filters simultaneously', async () => {
        await service.findAll(1, 50, { foodStatus: 'COOKING' as any, restaurantId: 3 });

        const callArg = mockPrismaOrder.findMany.mock.calls[0][0];
        expect(callArg.where).toMatchObject({ foodStatus: 'COOKING', restaurantId: 3 });
      });

      it('includes filters in cacheKey', async () => {
        const filters = { foodStatus: 'PENDING' as any };
        await service.findAll(2, 10, filters);

        expect(mockCacheManager.get).toHaveBeenCalledWith(
          `allOrders:2:10:${JSON.stringify(filters)}`,
        );
        expect(mockCacheManager.set).toHaveBeenCalledWith(
          `allOrders:2:10:${JSON.stringify(filters)}`,
          expect.anything(),
          30_000,
        );
      });

      it('calculates skip correctly for page > 1', async () => {
        await service.findAll(3, 10, {});

        const callArg = mockPrismaOrder.findMany.mock.calls[0][0];
        expect(callArg.skip).toBe(20);
        expect(callArg.take).toBe(10);
      });

      it('caches the result after fetching', async () => {
        await service.findAll(1, 50, {});

        expect(mockCacheManager.set).toHaveBeenCalledWith(
          'allOrders:1:50:{}',
          expect.objectContaining({ total: expect.any(Number), page: expect.any(Number) }),
          30_000,
        );
      });
    });
  });

  // =========================================================================
  // findOne
  // =========================================================================
  describe('findOne', () => {
    it('finds an order by id including orderItems with foodMenu', async () => {
      const order = { id: 1, orderItems: [{ id: 1, foodMenu: { name: 'Rice' } }] };
      mockPrismaOrder.findUnique.mockResolvedValueOnce(order);

      const result = await service.findOne(1);

      expect(mockPrismaOrder.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          orderItems: {
            include: { foodMenu: true },
          },
        },
      });
      expect(result.orderNumber).toBe('1');
      expect(result.orderItems[0].foodMenu.name).toBe('Rice');
    });

    it('throws UnauthorizedException when prisma throws', async () => {
      mockPrismaOrder.findUnique.mockRejectedValueOnce(new Error('not found'));

      await expect(service.findOne(99)).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // update
  // =========================================================================
  describe('update', () => {
    it('returns a string message with the id', () => {
      const result = service.update(42, {} as any);
      expect(result).toBe('This action updates a #42 order');
    });
  });

  // =========================================================================
  // remove
  // =========================================================================
  describe('remove', () => {
    it('deletes a PENDING order and returns a success message', async () => {
      const pendingOrder = makeCreatedOrder({ foodStatus: 'PENDING' });
      mockPrismaOrder.findUnique.mockResolvedValueOnce(pendingOrder);
      mockPrismaOrder.delete.mockResolvedValueOnce(pendingOrder);

      const result = await service.remove(1);

      expect(mockPrismaOrder.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual({ message: 'Order with ID: 1 has been successfully deleted.' });
    });

    it('returns a cannot-delete message for non-PENDING orders', async () => {
      const cookingOrder = makeCreatedOrder({ foodStatus: 'COOKING' });
      mockPrismaOrder.findUnique.mockResolvedValueOnce(cookingOrder);

      const result = await service.remove(1);

      expect(mockPrismaOrder.delete).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Order is being prepared cannot be deleted' });
    });

    it('throws UnauthorizedException when prisma throws', async () => {
      mockPrismaOrder.findUnique.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.remove(1)).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // updateFoodStatus
  // =========================================================================
  describe('updateFoodStatus', () => {
    it('updates the order foodStatus and creates a statusHistory entry', async () => {
      const updated = makeCreatedOrder({ foodStatus: 'COOKING' });
      mockPrismaOrder.update.mockResolvedValueOnce(updated);

      const result = await service.updateFoodStatus(1, 'COOKING', 10, 'PLATFORM_ADMIN');

      expect(mockPrismaOrder.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          foodStatus: 'COOKING',
          statusHistory: {
            create: { status: 'COOKING', userAccountId: 10 },
          },
        },
      });
      expect(result.foodStatus).toBe('COOKING');
    });

    it('throws when prisma throws', async () => {
      mockPrismaOrder.update.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.updateFoodStatus(1, 'COOKING', 10, 'PLATFORM_ADMIN')).rejects.toThrow(
        Error,
      );
    });
  });

  // =========================================================================
  // updatePayment
  // =========================================================================
  describe('updatePayment', () => {
    it('sets paymentStatus to PAID when status is true', async () => {
      const updated = makeCreatedOrder({ paymentStatus: 'PAID' });
      mockPrismaOrder.update.mockResolvedValueOnce(updated);

      const result = await service.updatePayment(1, true);

      expect(mockPrismaOrder.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { paymentStatus: 'PAID' },
      });
      expect(result.paymentStatus).toBe('PAID');
    });

    it('sets paymentStatus to PENDING when status is false', async () => {
      const updated = makeCreatedOrder({ paymentStatus: 'PENDING' });
      mockPrismaOrder.update.mockResolvedValueOnce(updated);

      await service.updatePayment(1, false);

      expect(mockPrismaOrder.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { paymentStatus: 'PENDING' },
      });
    });

    it('throws UnauthorizedException when prisma throws', async () => {
      mockPrismaOrder.update.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.updatePayment(1, true)).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // findTotalOrders
  // =========================================================================
  describe('findTotalOrders', () => {
    it('returns the count from prisma.order.count', async () => {
      mockPrismaOrder.count.mockResolvedValueOnce(42);

      const result = await service.findTotalOrders();

      expect(mockPrismaOrder.count).toHaveBeenCalledTimes(1);
      expect(result).toBe(42);
    });

    it('throws UnauthorizedException when prisma throws', async () => {
      mockPrismaOrder.count.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.findTotalOrders()).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // handleCheckoutSessionSuccess
  // =========================================================================
  describe('handleCheckoutSessionSuccess', () => {
    const sessionId = 'sess_success_001';

    beforeEach(() => {
      // Pre-populate the orderMap as createClientOrder would
      (service as any).orderMap.set(sessionId, makeOrderDto());
    });

    it('creates the order, updates payment, deletes from map, and returns success', async () => {
      const created = makeCreatedOrder({ id: 55 });
      const updated = makeCreatedOrder({ id: 55, paymentStatus: 'PAID' });
      mockPrismaOrder.create.mockResolvedValueOnce(created);
      mockPrismaOrder.update.mockResolvedValueOnce(updated);

      const result = await service.handleCheckoutSessionSuccess(sessionId);

      expect(mockPrismaOrder.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaOrder.update).toHaveBeenCalledWith({
        where: { id: 55 },
        data: { paymentStatus: 'PAID' },
      });
      expect((service as any).orderMap.has(sessionId)).toBe(false);
      expect(result).toEqual({ message: 'success', error: '' });
    });

    it('sets order.paid = true before calling create', async () => {
      const created = makeCreatedOrder({ id: 55 });
      const updated = makeCreatedOrder({ id: 55, paymentStatus: 'PAID' });
      mockPrismaOrder.create.mockResolvedValueOnce(created);
      mockPrismaOrder.update.mockResolvedValueOnce(updated);

      await service.handleCheckoutSessionSuccess(sessionId);

      const createArg = mockPrismaOrder.create.mock.calls[0][0];
      expect(createArg.data.paymentStatus).toBe('PAID');
    });

    it('throws UnauthorizedException when create fails', async () => {
      mockPrismaOrder.create.mockRejectedValueOnce(new Error('create failed'));

      await expect(service.handleCheckoutSessionSuccess(sessionId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // =========================================================================
  // handleCheckoutSessionFailed
  // =========================================================================
  describe('handleCheckoutSessionFailed', () => {
    const sessionId = 'sess_fail_001';

    it('deletes the session from orderMap and returns success', async () => {
      (service as any).orderMap.set(sessionId, makeOrderDto());

      const result = await service.handleCheckoutSessionFailed(sessionId);

      expect((service as any).orderMap.has(sessionId)).toBe(false);
      expect(result).toEqual({ message: 'success', error: '' });
    });

    it('does not throw when sessionId is not in the map', async () => {
      await expect(
        service.handleCheckoutSessionFailed('sess_nonexistent'),
      ).resolves.toEqual({ message: 'success', error: '' });
    });
  });
});
