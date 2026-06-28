import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TrackingGateway } from 'src/tracking/tracking.gateway';
import { DeliveryStatus, FoodStatus } from '@prisma/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockOrder = (overrides: Record<string, any> = {}) => ({
  id: 1,
  deliveryFee: 10,
  foodStatus: FoodStatus.READY,
  delivery: null,
  restaurant: {
    id: 10,
    name: 'Test Restaurant',
    address: '1 Test St',
    latitude: 5.6037,
    longitude: -0.187,
  },
  deliveryAddress: {
    address: '2 Drop St',
    latitude: 5.6100,
    longitude: -0.190,
  },
  ...overrides,
});

const mockRider = (overrides: Record<string, any> = {}) => ({
  id: 99,
  firstName: 'John',
  lastName: 'Doe',
  vehicleType: 'MOTORCYCLE',
  isAvailable: true,
  totalEarnings: 0,
  ...overrides,
});

const mockDelivery = (overrides: Record<string, any> = {}) => ({
  id: 1,
  orderId: 1,
  riderId: 99,
  status: DeliveryStatus.ASSIGNED,
  pickupLat: 5.6037,
  pickupLng: -0.187,
  dropoffLat: 5.6100,
  dropoffLng: -0.190,
  riderEarning: 8,
  pickedUpAt: null,
  deliveredAt: null,
  order: mockOrder(),
  ...overrides,
});

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('DeliveryService', () => {
  let service: DeliveryService;

  // Mock implementations
  const prismaMock = {
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    delivery: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    rider: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const trackingGatewayMock = {
    notifyOrderRoom: jest.fn(),
    notifyRider: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // Silence logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: TrackingGateway, useValue: trackingGatewayMock },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
  });

  // ─── initiateRiderSearch ─────────────────────────────────────────────────

  describe('initiateRiderSearch', () => {
    it('throws NotFoundException when order is not found', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await expect(service.initiateRiderSearch(1)).rejects.toThrow(NotFoundException);
      await expect(service.initiateRiderSearch(1)).rejects.toThrow('Order not found');
    });

    it('calls notifyNearbyRiders with INITIAL radius (5 km)', async () => {
      const order = mockOrder();
      prismaMock.order.findUnique.mockResolvedValue(order);
      // $queryRaw returns no riders — we just want to check the call happens
      prismaMock.$queryRaw.mockResolvedValue([]);

      await service.initiateRiderSearch(order.id);

      // The raw query is used inside notifyNearbyRiders which is called for the 5km radius
      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    });

    describe('timer — expands to 10 km after 2 minutes if still unassigned', () => {
      beforeEach(() => jest.useFakeTimers());
      afterEach(() => jest.useRealTimers());

      it('checks for an existing delivery after 2 minutes and expands search if unassigned', async () => {
        const order = mockOrder();
        prismaMock.order.findUnique.mockResolvedValue(order);
        // First call (5 km) — no riders
        prismaMock.$queryRaw.mockResolvedValue([]);
        // Delivery still not created
        prismaMock.delivery.findUnique.mockResolvedValue(null);

        await service.initiateRiderSearch(order.id);

        // Before timer fires only one $queryRaw call (5km)
        expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);

        jest.runAllTimers();

        // Allow the async callback inside setTimeout to settle
        await Promise.resolve();

        // After timer fires: delivery.findUnique checked + second $queryRaw for 10km
        expect(prismaMock.delivery.findUnique).toHaveBeenCalledWith({ where: { orderId: order.id } });
        expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2);
      });

      it('does NOT expand search if delivery was already assigned within 2 minutes', async () => {
        const order = mockOrder();
        prismaMock.order.findUnique.mockResolvedValue(order);
        prismaMock.$queryRaw.mockResolvedValue([]);
        // Delivery already exists — rider accepted
        prismaMock.delivery.findUnique.mockResolvedValue(mockDelivery());

        await service.initiateRiderSearch(order.id);

        jest.runAllTimers();
        await Promise.resolve();

        // delivery.findUnique checked but $queryRaw not called a second time
        expect(prismaMock.delivery.findUnique).toHaveBeenCalledWith({ where: { orderId: order.id } });
        expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ─── acceptDelivery ──────────────────────────────────────────────────────

  describe('acceptDelivery', () => {
    const riderId = 99;
    const orderId = 1;

    it('throws NotFoundException when order is not found', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await expect(service.acceptDelivery(riderId, orderId)).rejects.toThrow(NotFoundException);
      await expect(service.acceptDelivery(riderId, orderId)).rejects.toThrow('Order not found');
    });

    it('throws BadRequestException when order already has a delivery (already assigned)', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder({ delivery: mockDelivery() }));

      await expect(service.acceptDelivery(riderId, orderId)).rejects.toThrow(BadRequestException);
      await expect(service.acceptDelivery(riderId, orderId)).rejects.toThrow('already assigned');
    });

    it('throws BadRequestException when order foodStatus is CANCELLED', async () => {
      prismaMock.order.findUnique.mockResolvedValue(
        mockOrder({ delivery: null, foodStatus: FoodStatus.CANCELLED }),
      );

      await expect(service.acceptDelivery(riderId, orderId)).rejects.toThrow(BadRequestException);
      await expect(service.acceptDelivery(riderId, orderId)).rejects.toThrow('cancelled');
    });

    it('throws BadRequestException when rider is not found', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder());
      prismaMock.rider.findUnique.mockResolvedValue(null);

      await expect(service.acceptDelivery(riderId, orderId)).rejects.toThrow(BadRequestException);
      await expect(service.acceptDelivery(riderId, orderId)).rejects.toThrow('not available');
    });

    it('throws BadRequestException when rider is not available', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder());
      prismaMock.rider.findUnique.mockResolvedValue(mockRider({ isAvailable: false }));

      await expect(service.acceptDelivery(riderId, orderId)).rejects.toThrow(BadRequestException);
      await expect(service.acceptDelivery(riderId, orderId)).rejects.toThrow('not available');
    });

    it('creates delivery and sets rider unavailable in a $transaction on success', async () => {
      const order = mockOrder();
      const rider = mockRider();
      const delivery = mockDelivery();

      prismaMock.order.findUnique.mockResolvedValue(order);
      prismaMock.rider.findUnique.mockResolvedValue(rider);
      prismaMock.$transaction.mockResolvedValue([delivery]);

      await service.acceptDelivery(riderId, orderId);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it('clears the assignment timer if one exists', async () => {
      jest.useFakeTimers();

      const order = mockOrder();
      const rider = mockRider();
      const delivery = mockDelivery();

      prismaMock.order.findUnique.mockResolvedValue(order);
      prismaMock.$queryRaw.mockResolvedValue([]);
      // Start a timer by calling initiateRiderSearch first
      await service.initiateRiderSearch(orderId);

      prismaMock.rider.findUnique.mockResolvedValue(rider);
      prismaMock.$transaction.mockResolvedValue([delivery]);

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      await service.acceptDelivery(riderId, orderId);

      expect(clearTimeoutSpy).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('notifies customer via trackingGateway.notifyOrderRoom with delivery:assigned', async () => {
      const order = mockOrder();
      const rider = mockRider();
      const delivery = mockDelivery();

      prismaMock.order.findUnique.mockResolvedValue(order);
      prismaMock.rider.findUnique.mockResolvedValue(rider);
      prismaMock.$transaction.mockResolvedValue([delivery]);

      await service.acceptDelivery(riderId, orderId);

      expect(trackingGatewayMock.notifyOrderRoom).toHaveBeenCalledWith(
        orderId,
        'delivery:assigned',
        expect.objectContaining({ riderId }),
      );
    });

    it('returns the created delivery', async () => {
      const order = mockOrder();
      const rider = mockRider();
      const delivery = mockDelivery();

      prismaMock.order.findUnique.mockResolvedValue(order);
      prismaMock.rider.findUnique.mockResolvedValue(rider);
      prismaMock.$transaction.mockResolvedValue([delivery]);

      const result = await service.acceptDelivery(riderId, orderId);

      expect(result).toEqual(delivery);
    });
  });

  // ─── updateStatus ────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    const riderId = 99;
    const orderId = 1;

    it('throws UnauthorizedException when delivery is not found', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus(riderId, orderId, DeliveryStatus.PICKED_UP),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when delivery.riderId does not match riderId', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(mockDelivery({ riderId: 999 }));

      await expect(
        service.updateStatus(riderId, orderId, DeliveryStatus.PICKED_UP),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('sets pickedUpAt and updates order foodStatus when status is PICKED_UP', async () => {
      const delivery = mockDelivery({ riderId });
      const updatedDelivery = { ...delivery, status: DeliveryStatus.PICKED_UP, pickedUpAt: new Date() };

      prismaMock.delivery.findUnique.mockResolvedValue(delivery);
      prismaMock.order.update.mockResolvedValue({});
      prismaMock.delivery.update.mockResolvedValue(updatedDelivery);

      await service.updateStatus(riderId, orderId, DeliveryStatus.PICKED_UP);

      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: orderId },
          data: expect.objectContaining({ foodStatus: FoodStatus.PICKED_UP }),
        }),
      );

      expect(prismaMock.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DeliveryStatus.PICKED_UP,
            pickedUpAt: expect.any(Date),
          }),
        }),
      );
    });

    it('sets deliveredAt and runs $transaction updating order + rider when status is DELIVERED', async () => {
      const delivery = mockDelivery({ riderId, riderEarning: 8 });
      const updatedDelivery = { ...delivery, status: DeliveryStatus.DELIVERED, deliveredAt: new Date() };

      prismaMock.delivery.findUnique.mockResolvedValue(delivery);
      prismaMock.$transaction.mockResolvedValue([{}, {}]);
      prismaMock.delivery.update.mockResolvedValue(updatedDelivery);

      await service.updateStatus(riderId, orderId, DeliveryStatus.DELIVERED);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

      expect(prismaMock.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DeliveryStatus.DELIVERED,
            deliveredAt: expect.any(Date),
          }),
        }),
      );
    });

    it('updates delivery status and notifies customer via notifyOrderRoom for all statuses', async () => {
      const statuses = [
        DeliveryStatus.HEADING_TO_RESTAURANT,
        DeliveryStatus.ARRIVED_AT_RESTAURANT,
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.HEADING_TO_CUSTOMER,
        DeliveryStatus.DELIVERED,
      ];

      for (const status of statuses) {
        jest.clearAllMocks();

        const delivery = mockDelivery({ riderId });
        prismaMock.delivery.findUnique.mockResolvedValue(delivery);
        prismaMock.order.update.mockResolvedValue({});
        prismaMock.$transaction.mockResolvedValue([{}, {}]);
        prismaMock.delivery.update.mockResolvedValue({ ...delivery, status });

        await service.updateStatus(riderId, orderId, status);

        expect(prismaMock.delivery.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status }),
          }),
        );

        expect(trackingGatewayMock.notifyOrderRoom).toHaveBeenCalledWith(
          orderId,
          'delivery:status',
          expect.objectContaining({ status }),
        );
      }
    });

    it('returns the updated delivery', async () => {
      const delivery = mockDelivery({ riderId });
      const updated = { ...delivery, status: DeliveryStatus.HEADING_TO_RESTAURANT };

      prismaMock.delivery.findUnique.mockResolvedValue(delivery);
      prismaMock.delivery.update.mockResolvedValue(updated);

      const result = await service.updateStatus(riderId, orderId, DeliveryStatus.HEADING_TO_RESTAURANT);

      expect(result).toEqual(updated);
    });
  });

  // ─── updateRiderLocation ─────────────────────────────────────────────────

  describe('updateRiderLocation', () => {
    it('updates rider currentLat and currentLng', async () => {
      const riderId = 99;
      const lat = 5.6037;
      const lng = -0.187;
      const updatedRider = mockRider({ currentLat: lat, currentLng: lng });

      prismaMock.rider.update.mockResolvedValue(updatedRider);

      const result = await service.updateRiderLocation(riderId, lat, lng);

      expect(prismaMock.rider.update).toHaveBeenCalledWith({
        where: { id: riderId },
        data: { currentLat: lat, currentLng: lng },
      });

      expect(result).toEqual(updatedRider);
    });
  });
});
