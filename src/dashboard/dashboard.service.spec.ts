import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryService } from 'src/category/category.service';
import { FoodmenuService } from 'src/foodmenu/foodmenu.service';
import { OrdersService } from 'src/orders/orders.service';

const mockPrismaService = {};

const mockCategoryService = {
  findTotalCategories: jest.fn(),
};

const mockFoodmenuService = {
  findTotalFoodMenu: jest.fn(),
};

const mockOrdersService = {
  findTotalOrders: jest.fn(),
  getTotalOrderToday: jest.fn(),
  getTotalOrdersPreviousMonth: jest.fn(),
  getTotalOrderYesterday: jest.fn(),
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: FoodmenuService, useValue: mockFoodmenuService },
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should call all dependent service methods', async () => {
      mockCategoryService.findTotalCategories.mockResolvedValue(5);
      mockOrdersService.findTotalOrders.mockResolvedValue(42);
      mockOrdersService.getTotalOrderToday.mockResolvedValue([
        { totalAmount: 100 },
        { totalAmount: 50 },
      ]);
      mockOrdersService.getTotalOrdersPreviousMonth.mockResolvedValue([
        { totalAmount: 200 },
        { totalAmount: 300 },
      ]);
      mockOrdersService.getTotalOrderYesterday.mockResolvedValue([
        { totalAmount: 75 },
      ]);
      mockFoodmenuService.findTotalFoodMenu.mockResolvedValue(20);

      await service.findAll();

      expect(mockCategoryService.findTotalCategories).toHaveBeenCalledTimes(1);
      expect(mockOrdersService.findTotalOrders).toHaveBeenCalledTimes(1);
      expect(mockOrdersService.getTotalOrderToday).toHaveBeenCalledTimes(1);
      expect(mockOrdersService.getTotalOrdersPreviousMonth).toHaveBeenCalledTimes(1);
      expect(mockOrdersService.getTotalOrderYesterday).toHaveBeenCalledTimes(1);
      expect(mockFoodmenuService.findTotalFoodMenu).toHaveBeenCalledTimes(1);
    });

    it('should calculate totalTodaySales as the sum of today orders totalAmount', async () => {
      mockCategoryService.findTotalCategories.mockResolvedValue(3);
      mockOrdersService.findTotalOrders.mockResolvedValue(10);
      mockOrdersService.getTotalOrderToday.mockResolvedValue([
        { totalAmount: 100 },
        { totalAmount: 50 },
        { totalAmount: 25 },
      ]);
      mockOrdersService.getTotalOrdersPreviousMonth.mockResolvedValue([
        { totalAmount: 400 },
      ]);
      mockOrdersService.getTotalOrderYesterday.mockResolvedValue([
        { totalAmount: 60 },
      ]);
      mockFoodmenuService.findTotalFoodMenu.mockResolvedValue(15);

      const result = await service.findAll();

      expect(result.totalTodaySales).toBe(175);
    });

    it('should calculate totalSalesPreviousMonth as the sum of previous month orders totalAmount', async () => {
      mockCategoryService.findTotalCategories.mockResolvedValue(3);
      mockOrdersService.findTotalOrders.mockResolvedValue(10);
      mockOrdersService.getTotalOrderToday.mockResolvedValue([
        { totalAmount: 50 },
      ]);
      mockOrdersService.getTotalOrdersPreviousMonth.mockResolvedValue([
        { totalAmount: 200 },
        { totalAmount: 300 },
        { totalAmount: 100 },
      ]);
      mockOrdersService.getTotalOrderYesterday.mockResolvedValue([
        { totalAmount: 60 },
      ]);
      mockFoodmenuService.findTotalFoodMenu.mockResolvedValue(15);

      const result = await service.findAll();

      expect(result.totalSalesPreviousMonth).toBe(600);
    });

    it('should calculate totalSalesYesterday as the sum of yesterday orders totalAmount', async () => {
      mockCategoryService.findTotalCategories.mockResolvedValue(3);
      mockOrdersService.findTotalOrders.mockResolvedValue(10);
      mockOrdersService.getTotalOrderToday.mockResolvedValue([
        { totalAmount: 50 },
      ]);
      mockOrdersService.getTotalOrdersPreviousMonth.mockResolvedValue([
        { totalAmount: 200 },
      ]);
      mockOrdersService.getTotalOrderYesterday.mockResolvedValue([
        { totalAmount: 80 },
        { totalAmount: 40 },
      ]);
      mockFoodmenuService.findTotalFoodMenu.mockResolvedValue(15);

      const result = await service.findAll();

      expect(result.totalSalesYesterday).toBe(120);
    });

    it('should return the full stats object with all expected fields', async () => {
      mockCategoryService.findTotalCategories.mockResolvedValue(5);
      mockOrdersService.findTotalOrders.mockResolvedValue(42);
      mockOrdersService.getTotalOrderToday.mockResolvedValue([
        { totalAmount: 100 },
        { totalAmount: 50 },
      ]);
      mockOrdersService.getTotalOrdersPreviousMonth.mockResolvedValue([
        { totalAmount: 200 },
        { totalAmount: 300 },
      ]);
      mockOrdersService.getTotalOrderYesterday.mockResolvedValue([
        { totalAmount: 75 },
      ]);
      mockFoodmenuService.findTotalFoodMenu.mockResolvedValue(20);

      const result = await service.findAll();

      expect(result).toEqual({
        totalCategory: 5,
        totalorder: 42,
        totalOrdersForToday: 2,
        totalOrdersPreviousMonth: 2,
        totalSalesPreviousMonth: 500,
        totalOrdersYesterday: 1,
        totalSalesYesterday: 75,
        totalOrdersthisMonth: 'N/A',
        totalSalesthisMonth: 'NA',
        totalTodaySales: 150,
        totalFoodMenu: 20,
      });
    });

    it('should return zero sums and zero counts when all order arrays are empty', async () => {
      mockCategoryService.findTotalCategories.mockResolvedValue(0);
      mockOrdersService.findTotalOrders.mockResolvedValue(0);
      mockOrdersService.getTotalOrderToday.mockResolvedValue([]);
      mockOrdersService.getTotalOrdersPreviousMonth.mockResolvedValue([]);
      mockOrdersService.getTotalOrderYesterday.mockResolvedValue([]);
      mockFoodmenuService.findTotalFoodMenu.mockResolvedValue(0);

      const result = await service.findAll();

      expect(result).toEqual({
        totalCategory: 0,
        totalorder: 0,
        totalOrdersForToday: 0,
        totalOrdersPreviousMonth: 0,
        totalSalesPreviousMonth: 0,
        totalOrdersYesterday: 0,
        totalSalesYesterday: 0,
        totalOrdersthisMonth: 'N/A',
        totalSalesthisMonth: 'NA',
        totalTodaySales: 0,
        totalFoodMenu: 0,
      });
    });

    it('should reflect totalOrdersForToday as the length of the today orders array', async () => {
      mockCategoryService.findTotalCategories.mockResolvedValue(2);
      mockOrdersService.findTotalOrders.mockResolvedValue(8);
      mockOrdersService.getTotalOrderToday.mockResolvedValue([
        { totalAmount: 10 },
        { totalAmount: 20 },
        { totalAmount: 30 },
        { totalAmount: 40 },
      ]);
      mockOrdersService.getTotalOrdersPreviousMonth.mockResolvedValue([]);
      mockOrdersService.getTotalOrderYesterday.mockResolvedValue([]);
      mockFoodmenuService.findTotalFoodMenu.mockResolvedValue(10);

      const result = await service.findAll();

      expect(result.totalOrdersForToday).toBe(4);
    });

    it('should reflect totalOrdersPreviousMonth as the length of the previous month orders array', async () => {
      mockCategoryService.findTotalCategories.mockResolvedValue(2);
      mockOrdersService.findTotalOrders.mockResolvedValue(8);
      mockOrdersService.getTotalOrderToday.mockResolvedValue([]);
      mockOrdersService.getTotalOrdersPreviousMonth.mockResolvedValue([
        { totalAmount: 100 },
        { totalAmount: 200 },
        { totalAmount: 300 },
      ]);
      mockOrdersService.getTotalOrderYesterday.mockResolvedValue([]);
      mockFoodmenuService.findTotalFoodMenu.mockResolvedValue(10);

      const result = await service.findAll();

      expect(result.totalOrdersPreviousMonth).toBe(3);
    });

    it('should reflect totalOrdersYesterday as the length of the yesterday orders array', async () => {
      mockCategoryService.findTotalCategories.mockResolvedValue(2);
      mockOrdersService.findTotalOrders.mockResolvedValue(8);
      mockOrdersService.getTotalOrderToday.mockResolvedValue([]);
      mockOrdersService.getTotalOrdersPreviousMonth.mockResolvedValue([]);
      mockOrdersService.getTotalOrderYesterday.mockResolvedValue([
        { totalAmount: 50 },
        { totalAmount: 70 },
      ]);
      mockFoodmenuService.findTotalFoodMenu.mockResolvedValue(10);

      const result = await service.findAll();

      expect(result.totalOrdersYesterday).toBe(2);
    });

    it('should include totalFoodMenu from foodMenuService.findTotalFoodMenu', async () => {
      mockCategoryService.findTotalCategories.mockResolvedValue(4);
      mockOrdersService.findTotalOrders.mockResolvedValue(20);
      mockOrdersService.getTotalOrderToday.mockResolvedValue([]);
      mockOrdersService.getTotalOrdersPreviousMonth.mockResolvedValue([]);
      mockOrdersService.getTotalOrderYesterday.mockResolvedValue([]);
      mockFoodmenuService.findTotalFoodMenu.mockResolvedValue(99);

      const result = await service.findAll();

      expect(result.totalFoodMenu).toBe(99);
    });

    it('should include totalCategory from categoryService.findTotalCategories', async () => {
      mockCategoryService.findTotalCategories.mockResolvedValue(12);
      mockOrdersService.findTotalOrders.mockResolvedValue(5);
      mockOrdersService.getTotalOrderToday.mockResolvedValue([]);
      mockOrdersService.getTotalOrdersPreviousMonth.mockResolvedValue([]);
      mockOrdersService.getTotalOrderYesterday.mockResolvedValue([]);
      mockFoodmenuService.findTotalFoodMenu.mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.totalCategory).toBe(12);
    });

    it('should include totalorder from orderService.findTotalOrders', async () => {
      mockCategoryService.findTotalCategories.mockResolvedValue(1);
      mockOrdersService.findTotalOrders.mockResolvedValue(500);
      mockOrdersService.getTotalOrderToday.mockResolvedValue([]);
      mockOrdersService.getTotalOrdersPreviousMonth.mockResolvedValue([]);
      mockOrdersService.getTotalOrderYesterday.mockResolvedValue([]);
      mockFoodmenuService.findTotalFoodMenu.mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.totalorder).toBe(500);
    });

    it('should always return totalOrdersthisMonth as "N/A" and totalSalesthisMonth as "NA"', async () => {
      mockCategoryService.findTotalCategories.mockResolvedValue(1);
      mockOrdersService.findTotalOrders.mockResolvedValue(1);
      mockOrdersService.getTotalOrderToday.mockResolvedValue([{ totalAmount: 10 }]);
      mockOrdersService.getTotalOrdersPreviousMonth.mockResolvedValue([{ totalAmount: 20 }]);
      mockOrdersService.getTotalOrderYesterday.mockResolvedValue([{ totalAmount: 30 }]);
      mockFoodmenuService.findTotalFoodMenu.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.totalOrdersthisMonth).toBe('N/A');
      expect(result.totalSalesthisMonth).toBe('NA');
    });
  });
});
