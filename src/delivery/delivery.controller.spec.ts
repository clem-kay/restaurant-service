import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { AtGuard } from 'src/guards/at.guard';
import { DeliveryStatus } from '@prisma/client';

describe('DeliveryController', () => {
  let controller: DeliveryController;

  const mockDeliveryService = {
    acceptDelivery: jest.fn(),
    updateStatus: jest.fn(),
    updateRiderLocation: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryController],
      providers: [
        { provide: DeliveryService, useValue: mockDeliveryService },
      ],
    })
      .overrideGuard(AtGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DeliveryController>(DeliveryController);
  });

  // ─── accept ───────────────────────────────────────────────────────────────

  describe('accept', () => {
    it('calls deliveryService.acceptDelivery with riderId and orderId', async () => {
      const riderId = 99;
      const orderId = 1;
      const expected = { id: 7, orderId, riderId, status: DeliveryStatus.ASSIGNED };

      mockDeliveryService.acceptDelivery.mockResolvedValue(expected);

      const result = await controller.accept(riderId, orderId);

      expect(mockDeliveryService.acceptDelivery).toHaveBeenCalledWith(riderId, orderId);
      expect(result).toEqual(expected);
    });
  });

  // ─── updateStatus ─────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('calls deliveryService.updateStatus with riderId, orderId, and status', async () => {
      const riderId = 99;
      const orderId = 1;
      const status = DeliveryStatus.PICKED_UP;
      const expected = { id: 7, orderId, riderId, status };

      mockDeliveryService.updateStatus.mockResolvedValue(expected);

      const result = await controller.updateStatus(riderId, orderId, status);

      expect(mockDeliveryService.updateStatus).toHaveBeenCalledWith(riderId, orderId, status);
      expect(result).toEqual(expected);
    });
  });

  // ─── updateLocation ───────────────────────────────────────────────────────

  describe('updateLocation', () => {
    it('calls deliveryService.updateRiderLocation with riderId, lat, and lng from body', async () => {
      const riderId = 99;
      const body = { lat: 5.6042, lng: -0.1875 };
      const expected = { id: 99, currentLat: body.lat, currentLng: body.lng };

      mockDeliveryService.updateRiderLocation.mockResolvedValue(expected);

      const result = await controller.updateLocation(riderId, body);

      expect(mockDeliveryService.updateRiderLocation).toHaveBeenCalledWith(riderId, body.lat, body.lng);
      expect(result).toEqual(expected);
    });
  });
});
