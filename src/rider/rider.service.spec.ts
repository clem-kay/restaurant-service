import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { VehicleType } from '@prisma/client';
import { RiderService } from './rider.service';
import { PrismaService } from 'src/prisma/prisma.service';

const mockPrisma = {
  rider: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  delivery: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const baseRider = {
  id: 1,
  firstName: 'James',
  lastName: 'Mensah',
  phone: '+233244111222',
  vehicleType: VehicleType.MOTORCYCLE,
  vehiclePlate: 'GR-1234-22',
  isAvailable: false,
  isApproved: false,
  currentLat: null,
  currentLng: null,
  totalEarnings: 0,
  accountId: 20,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('RiderService', () => {
  let service: RiderService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiderService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RiderService>(RiderService);
  });

  // ─── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    const dto = {
      firstName: 'James',
      lastName: 'Mensah',
      phone: '+233244111222',
      vehicleType: VehicleType.MOTORCYCLE,
      vehiclePlate: 'GR-1234-22',
    };

    it('throws BadRequestException when rider profile already exists', async () => {
      mockPrisma.rider.findUnique.mockResolvedValue(baseRider);

      await expect(service.register(20, dto)).rejects.toThrow(BadRequestException);
      await expect(service.register(20, dto)).rejects.toThrow('Rider profile already exists');
    });

    it('creates and returns a new rider profile', async () => {
      mockPrisma.rider.findUnique.mockResolvedValue(null);
      mockPrisma.rider.create.mockResolvedValue(baseRider);

      const result = await service.register(20, dto);

      expect(mockPrisma.rider.create).toHaveBeenCalledWith({
        data: { ...dto, accountId: 20 },
      });
      expect(result).toEqual(baseRider);
    });
  });

  // ─── getProfile ────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('throws NotFoundException when rider not found', async () => {
      mockPrisma.rider.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(20)).rejects.toThrow(NotFoundException);
    });

    it('returns rider profile with account info', async () => {
      const profile = { ...baseRider, account: { profile: null } };
      mockPrisma.rider.findUnique.mockResolvedValue(profile);

      const result = await service.getProfile(20);

      expect(mockPrisma.rider.findUnique).toHaveBeenCalledWith({
        where: { accountId: 20 },
        include: {
          account: { include: { profile: true } },
        },
      });
      expect(result).toEqual(profile);
    });
  });

  // ─── updateProfile ─────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    const dto = { firstName: 'Kwame' };

    it('throws NotFoundException when rider not found', async () => {
      mockPrisma.rider.findUnique.mockResolvedValue(null);

      await expect(service.updateProfile(20, dto)).rejects.toThrow(NotFoundException);
    });

    it('updates and returns the rider profile', async () => {
      const updated = { ...baseRider, firstName: 'Kwame' };
      mockPrisma.rider.findUnique.mockResolvedValue(baseRider);
      mockPrisma.rider.update.mockResolvedValue(updated);

      const result = await service.updateProfile(20, dto);

      expect(mockPrisma.rider.update).toHaveBeenCalledWith({
        where: { id: baseRider.id },
        data: dto,
      });
      expect(result).toEqual(updated);
    });
  });

  // ─── toggleAvailability ────────────────────────────────────────────────────

  describe('toggleAvailability', () => {
    it('throws NotFoundException when rider not found', async () => {
      mockPrisma.rider.findUnique.mockResolvedValue(null);

      await expect(service.toggleAvailability(20, true)).rejects.toThrow(NotFoundException);
    });

    it('sets isAvailable to true', async () => {
      const updated = { ...baseRider, isAvailable: true };
      mockPrisma.rider.findUnique.mockResolvedValue(baseRider);
      mockPrisma.rider.update.mockResolvedValue(updated);

      const result = await service.toggleAvailability(20, true);

      expect(mockPrisma.rider.update).toHaveBeenCalledWith({
        where: { id: baseRider.id },
        data: { isAvailable: true },
      });
      expect(result.isAvailable).toBe(true);
    });

    it('sets isAvailable to false', async () => {
      const updated = { ...baseRider, isAvailable: false };
      mockPrisma.rider.findUnique.mockResolvedValue({ ...baseRider, isAvailable: true });
      mockPrisma.rider.update.mockResolvedValue(updated);

      const result = await service.toggleAvailability(20, false);

      expect(mockPrisma.rider.update).toHaveBeenCalledWith({
        where: { id: baseRider.id },
        data: { isAvailable: false },
      });
      expect(result.isAvailable).toBe(false);
    });
  });

  // ─── getDeliveries ─────────────────────────────────────────────────────────

  describe('getDeliveries', () => {
    it('throws NotFoundException when rider not found', async () => {
      mockPrisma.rider.findUnique.mockResolvedValue(null);

      await expect(service.getDeliveries(20)).rejects.toThrow(NotFoundException);
    });

    it('returns deliveries sorted by createdAt desc', async () => {
      const deliveries = [{ id: 1, riderId: 1, order: { id: 5, totalAmount: 80 } }];
      mockPrisma.rider.findUnique.mockResolvedValue(baseRider);
      mockPrisma.delivery.findMany.mockResolvedValue(deliveries);

      const result = await service.getDeliveries(20);

      expect(mockPrisma.delivery.findMany).toHaveBeenCalledWith({
        where: { riderId: baseRider.id },
        include: {
          order: {
            select: {
              id: true,
              totalAmount: true,
              createdAt: true,
              restaurant: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(deliveries);
    });
  });

  // ─── getEarnings ───────────────────────────────────────────────────────────

  describe('getEarnings', () => {
    it('throws NotFoundException when rider not found', async () => {
      mockPrisma.rider.findUnique.mockResolvedValue(null);

      await expect(service.getEarnings(20)).rejects.toThrow(NotFoundException);
    });

    it('returns totalEarnings and totalDeliveries count', async () => {
      mockPrisma.rider.findUnique.mockResolvedValue({ ...baseRider, totalEarnings: 450.5 });
      mockPrisma.delivery.count.mockResolvedValue(38);

      const result = await service.getEarnings(20);

      expect(mockPrisma.delivery.count).toHaveBeenCalledWith({
        where: { riderId: baseRider.id },
      });
      expect(result).toEqual({ totalEarnings: 450.5, totalDeliveries: 38 });
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all riders with no filters', async () => {
      const riders = [baseRider];
      mockPrisma.rider.findMany.mockResolvedValue(riders);

      const result = await service.findAll();

      expect(mockPrisma.rider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
      expect(result).toEqual(riders);
    });

    it('filters by isApproved', async () => {
      mockPrisma.rider.findMany.mockResolvedValue([]);

      await service.findAll({ isApproved: true });

      expect(mockPrisma.rider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isApproved: true } }),
      );
    });

    it('filters by isAvailable', async () => {
      mockPrisma.rider.findMany.mockResolvedValue([]);

      await service.findAll({ isAvailable: false });

      expect(mockPrisma.rider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isAvailable: false } }),
      );
    });

    it('filters by both isApproved and isAvailable', async () => {
      mockPrisma.rider.findMany.mockResolvedValue([baseRider]);

      await service.findAll({ isApproved: true, isAvailable: true });

      expect(mockPrisma.rider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isApproved: true, isAvailable: true } }),
      );
    });
  });

  // ─── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('throws NotFoundException when rider not found', async () => {
      mockPrisma.rider.findUnique.mockResolvedValue(null);

      await expect(service.findById(99)).rejects.toThrow(NotFoundException);
    });

    it('returns rider with account and deliveries', async () => {
      const rider = { ...baseRider, account: { profile: null }, deliveries: [] };
      mockPrisma.rider.findUnique.mockResolvedValue(rider);

      const result = await service.findById(1);

      expect(mockPrisma.rider.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          account: { include: { profile: true } },
          deliveries: true,
        },
      });
      expect(result).toEqual(rider);
    });
  });

  // ─── setApproval ───────────────────────────────────────────────────────────

  describe('setApproval', () => {
    it('throws NotFoundException when rider not found', async () => {
      mockPrisma.rider.findUnique.mockResolvedValue(null);

      await expect(service.setApproval(99, true)).rejects.toThrow(NotFoundException);
    });

    it('approves the rider and returns the updated record', async () => {
      const updated = { ...baseRider, isApproved: true };
      mockPrisma.rider.findUnique.mockResolvedValue(baseRider);
      mockPrisma.rider.update.mockResolvedValue(updated);

      const result = await service.setApproval(1, true);

      expect(mockPrisma.rider.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isApproved: true },
      });
      expect(result.isApproved).toBe(true);
    });

    it('rejects the rider (isApproved=false)', async () => {
      const updated = { ...baseRider, isApproved: false };
      mockPrisma.rider.findUnique.mockResolvedValue({ ...baseRider, isApproved: true });
      mockPrisma.rider.update.mockResolvedValue(updated);

      const result = await service.setApproval(1, false);

      expect(mockPrisma.rider.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isApproved: false },
      });
      expect(result.isApproved).toBe(false);
    });
  });
});
