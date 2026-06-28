import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { OnboardingMethod, UserRole } from '@prisma/client';

const mockPrisma = {
  userAccount: { findUnique: jest.fn() },
  restaurant: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  openingHours: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

const baseRestaurant = {
  id: 1,
  name: 'Test Restaurant',
  ownerId: 10,
  isApproved: true,
  isOpen: true,
  createdAt: new Date(),
};

describe('RestaurantService', () => {
  let service: RestaurantService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RestaurantService>(RestaurantService);
  });

  describe('selfRegister', () => {
    const dto: any = { name: 'My Place', address: '1 Test St' };

    it('throws ForbiddenException when account is not RESTAURANT_ADMIN', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({ id: 10, role: UserRole.CUSTOMER });

      await expect(service.selfRegister(10, dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when account already has a restaurant', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({ id: 10, role: UserRole.RESTAURANT_ADMIN });
      mockPrisma.restaurant.findUnique.mockResolvedValue(baseRestaurant);

      await expect(service.selfRegister(10, dto)).rejects.toThrow(BadRequestException);
    });

    it('creates restaurant with isApproved=false and returns message', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({ id: 10, role: UserRole.RESTAURANT_ADMIN });
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);
      mockPrisma.restaurant.create.mockResolvedValue({ ...baseRestaurant, isApproved: false });

      const result = await service.selfRegister(10, dto);

      expect(mockPrisma.restaurant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ownerId: 10,
          onboardingMethod: OnboardingMethod.SELF_SERVICE,
          isApproved: false,
        }),
      });
      expect(result.message).toContain('under review');
    });
  });

  describe('manualCreate', () => {
    const dto: any = { name: 'My Place', address: '1 Test St', ownerId: 5 };

    it('throws BadRequestException when owner already has a restaurant', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(baseRestaurant);

      await expect(service.manualCreate(dto)).rejects.toThrow(BadRequestException);
    });

    it('creates restaurant with isApproved=true by default', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);
      mockPrisma.restaurant.create.mockResolvedValue({ ...baseRestaurant, isApproved: true });

      const result = await service.manualCreate(dto);

      expect(mockPrisma.restaurant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ownerId: 5,
          onboardingMethod: OnboardingMethod.MANUAL,
          isApproved: true,
        }),
      });
      expect(result).toEqual(expect.objectContaining({ isApproved: true }));
    });

    it('creates restaurant with isApproved=false when explicitly set', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);
      mockPrisma.restaurant.create.mockResolvedValue({ ...baseRestaurant, isApproved: false });

      await service.manualCreate({ ...dto, isApproved: false });

      expect(mockPrisma.restaurant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isApproved: false }),
      });
    });
  });

  describe('setApproval', () => {
    it('throws NotFoundException when restaurant not found', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(service.setApproval(99, true)).rejects.toThrow(NotFoundException);
    });

    it('approves restaurant and returns updated record', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(baseRestaurant);
      mockPrisma.restaurant.update.mockResolvedValue({ ...baseRestaurant, isApproved: true });

      const result = await service.setApproval(1, true);

      expect(mockPrisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isApproved: true },
      });
      expect(result.isApproved).toBe(true);
    });

    it('rejects restaurant (isApproved=false)', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(baseRestaurant);
      mockPrisma.restaurant.update.mockResolvedValue({ ...baseRestaurant, isApproved: false });

      await service.setApproval(1, false);

      expect(mockPrisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isApproved: false },
      });
    });
  });

  describe('findNearby', () => {
    it('executes haversine raw query and returns results', async () => {
      const restaurants = [{ id: 1, name: 'Close Restaurant', distanceKm: 1.5 }];
      mockPrisma.$queryRaw.mockResolvedValue(restaurants);

      const result = await service.findNearby(5.6037, -0.187, 10);

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result).toEqual(restaurants);
    });

    it('uses default radius of 10km when not provided', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await service.findNearby(5.6037, -0.187);

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('findMenuByRestaurant', () => {
    it('throws NotFoundException when restaurant not found or not approved', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(service.findMenuByRestaurant(99)).rejects.toThrow(NotFoundException);
    });

    it('returns restaurant with categories and menu items', async () => {
      const restaurant = { ...baseRestaurant, categories: [{ id: 1, menu: [] }] };
      mockPrisma.restaurant.findUnique.mockResolvedValue(restaurant);

      const result = await service.findMenuByRestaurant(1);

      expect(result).toEqual(restaurant);
    });
  });

  describe('toggleOpen', () => {
    it('updates restaurant isOpen field', async () => {
      mockPrisma.restaurant.update.mockResolvedValue({ ...baseRestaurant, isOpen: false });

      await service.toggleOpen(10, false);

      expect(mockPrisma.restaurant.update).toHaveBeenCalledWith({
        where: { ownerId: 10 },
        data: { isOpen: false },
      });
    });
  });

  describe('updateOpeningHours', () => {
    const hours = [{ dayOfWeek: 1, openTime: '09:00', closeTime: '22:00', isClosed: false }];

    it('throws NotFoundException when restaurant not found', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(service.updateOpeningHours(10, hours)).rejects.toThrow(NotFoundException);
    });

    it('deletes existing hours then creates new ones', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(baseRestaurant);
      mockPrisma.openingHours.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.openingHours.createMany.mockResolvedValue({ count: 1 });

      await service.updateOpeningHours(10, hours);

      expect(mockPrisma.openingHours.deleteMany).toHaveBeenCalledWith({ where: { restaurantId: 1 } });
      expect(mockPrisma.openingHours.createMany).toHaveBeenCalledWith({
        data: [{ ...hours[0], restaurantId: 1 }],
      });
    });
  });

  describe('findPendingApprovals', () => {
    it('returns restaurants with isApproved=false', async () => {
      const pending = [{ ...baseRestaurant, isApproved: false }];
      mockPrisma.restaurant.findMany.mockResolvedValue(pending);

      const result = await service.findPendingApprovals();

      expect(mockPrisma.restaurant.findMany).toHaveBeenCalledWith({ where: { isApproved: false } });
      expect(result).toEqual(pending);
    });
  });

  describe('findAll', () => {
    it('returns all restaurants with no filters', async () => {
      mockPrisma.restaurant.findMany.mockResolvedValue([baseRestaurant]);

      const result = await service.findAll();

      expect(mockPrisma.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
      expect(result).toEqual([baseRestaurant]);
    });

    it('filters by isApproved', async () => {
      mockPrisma.restaurant.findMany.mockResolvedValue([baseRestaurant]);

      await service.findAll({ isApproved: true });

      expect(mockPrisma.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isApproved: true } }),
      );
    });

    it('filters by isOpen', async () => {
      mockPrisma.restaurant.findMany.mockResolvedValue([]);

      await service.findAll({ isOpen: false });

      expect(mockPrisma.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isOpen: false } }),
      );
    });

    it('filters by both isApproved and isOpen', async () => {
      mockPrisma.restaurant.findMany.mockResolvedValue([baseRestaurant]);

      await service.findAll({ isApproved: true, isOpen: true });

      expect(mockPrisma.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isApproved: true, isOpen: true } }),
      );
    });
  });
});
