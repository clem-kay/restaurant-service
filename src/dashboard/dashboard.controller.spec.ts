import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AtGuard } from 'src/guards/at.guard';

describe('DashboardController', () => {
  let controller: DashboardController;
  let dashboardService: { findAll: jest.Mock };

  beforeEach(async () => {
    dashboardService = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: dashboardService,
        },
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

  describe('findAll', () => {
    it('should return the result from dashboardService.findAll()', async () => {
      const mockStats = {
        totalCategory: 8,
        totalorder: 243,
        totalOrdersForToday: 12,
        totalOrdersPreviousMonth: 30,
        totalSalesPreviousMonth: 18750.0,
        totalOrdersYesterday: 10,
        totalSalesYesterday: 820.0,
        totalOrdersthisMonth: 'N/A',
        totalSalesthisMonth: 'NA',
        totalTodaySales: 975.0,
        totalFoodMenu: 64,
      };

      dashboardService.findAll.mockResolvedValue(mockStats);

      const result = await controller.findAll();

      expect(dashboardService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockStats);
    });
  });
});
