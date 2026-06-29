import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

const mockPrismaService = {
  restaurant: { count: jest.fn().mockResolvedValue(0) },
  userAccount: { count: jest.fn().mockResolvedValue(0), findUnique: jest.fn() },
  customer: { count: jest.fn().mockResolvedValue(0) },
  rider: { count: jest.fn().mockResolvedValue(0) },
  order: { count: jest.fn().mockResolvedValue(0), aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 0 } }) },
  foodMenu: { count: jest.fn().mockResolvedValue(0) },
  foodCategory: { count: jest.fn().mockResolvedValue(0) },
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    Object.values(mockPrismaService).forEach((model) => {
      Object.values(model).forEach((fn) => {
        if (typeof fn === 'function') (fn as jest.Mock).mockClear();
      });
    });
    mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { totalAmount: 0 } });
    mockPrismaService.restaurant.count.mockResolvedValue(0);
    mockPrismaService.order.count.mockResolvedValue(0);
    mockPrismaService.foodMenu.count.mockResolvedValue(0);
    mockPrismaService.foodCategory.count.mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getPlatformStats should return platform-level stats', async () => {
    const result = await service.getPlatformStats();
    expect(result).toHaveProperty('totalRestaurants');
    expect(result).toHaveProperty('totalOrders');
    expect(result).toHaveProperty('totalRevenue');
  });

  it('getRestaurantStats returns empty stats when no restaurant linked', async () => {
    mockPrismaService.userAccount.findUnique.mockResolvedValue({ managedRestaurantId: null });
    const result = await service.getRestaurantStats(1, UserRole.RESTAURANT_STAFF);
    expect(result.totalOrders).toBe(0);
  });
});
