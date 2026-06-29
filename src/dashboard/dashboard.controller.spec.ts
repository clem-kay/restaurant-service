import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AtGuard } from 'src/guards/at.guard';

describe('DashboardController', () => {
  let controller: DashboardController;
  let dashboardService: { getPlatformStats: jest.Mock; getRestaurantStats: jest.Mock };

  beforeEach(async () => {
    dashboardService = {
      getPlatformStats: jest.fn(),
      getRestaurantStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: dashboardService },
      ],
    })
      .overrideGuard(AtGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getPlatformStats for PLATFORM_ADMIN', async () => {
    const mockStats = { totalRestaurants: 5, totalOrders: 100, totalRevenue: 5000 };
    dashboardService.getPlatformStats.mockResolvedValue(mockStats);

    const result = await controller.findAll(1, 'PLATFORM_ADMIN', undefined);

    expect(dashboardService.getPlatformStats).toHaveBeenCalledWith(undefined);
    expect(result).toEqual(mockStats);
  });

  it('should call getRestaurantStats for RESTAURANT_ADMIN', async () => {
    const mockStats = { totalOrders: 20, todaySales: 300 };
    dashboardService.getRestaurantStats.mockResolvedValue(mockStats);

    const result = await controller.findAll(2, 'RESTAURANT_ADMIN', undefined);

    expect(dashboardService.getRestaurantStats).toHaveBeenCalledWith(2, 'RESTAURANT_ADMIN');
    expect(result).toEqual(mockStats);
  });
});
