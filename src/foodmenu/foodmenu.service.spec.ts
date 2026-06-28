import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { FoodmenuService } from './foodmenu.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFoodmenuDto } from './dto/create-foodmenu.dto';

const mockFoodMenuItem = {
  id: 1,
  name: 'Jollof Rice',
  price: 15.99,
  quantity: 10,
  imageUrl: 'https://example.com/jollof.jpg',
  description: 'West African classic',
  restaurantId: 5,
  categoryId: 3,
  isAvailable: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockPrismaService = {
  foodMenu: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

describe('FoodmenuService', () => {
  let service: FoodmenuService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodmenuService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FoodmenuService>(FoodmenuService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreateFoodmenuDto = {
      name: 'Jollof Rice',
      price: 15.99,
      quantity: 10,
      imageUrl: 'https://example.com/jollof.jpg',
      description: 'West African classic',
      categoryId: 3,
    };

    it('should create a menu item scoped to the given restaurantId', async () => {
      prisma.foodMenu.create.mockResolvedValue(mockFoodMenuItem);

      const result = await service.create(5, dto);

      expect(prisma.foodMenu.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ restaurantId: 5, categoryId: 3 }),
      });
      expect(result).toEqual(mockFoodMenuItem);
    });

    it('should throw when prisma.create fails', async () => {
      prisma.foodMenu.create.mockRejectedValue(new Error('DB error'));
      await expect(service.create(5, dto)).rejects.toThrow('DB error');
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all items when no filters are provided', async () => {
      prisma.foodMenu.findMany.mockResolvedValue([mockFoodMenuItem]);

      const result = await service.findAll();

      expect(prisma.foodMenu.findMany).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual([mockFoodMenuItem]);
    });

    it('should filter by isAvailable=true', async () => {
      prisma.foodMenu.findMany.mockResolvedValue([mockFoodMenuItem]);
      await service.findAll({ isAvailable: true });
      expect(prisma.foodMenu.findMany).toHaveBeenCalledWith({ where: { isAvailable: true } });
    });

    it('should filter by restaurantId', async () => {
      prisma.foodMenu.findMany.mockResolvedValue([mockFoodMenuItem]);
      await service.findAll({ restaurantId: 5 });
      expect(prisma.foodMenu.findMany).toHaveBeenCalledWith({ where: { restaurantId: 5 } });
    });

    it('should filter by categoryId', async () => {
      prisma.foodMenu.findMany.mockResolvedValue([mockFoodMenuItem]);
      await service.findAll({ categoryId: 3 });
      expect(prisma.foodMenu.findMany).toHaveBeenCalledWith({ where: { categoryId: 3 } });
    });

    it('should throw when prisma.findMany fails', async () => {
      prisma.foodMenu.findMany.mockRejectedValue(new Error('DB error'));
      await expect(service.findAll()).rejects.toThrow('DB error');
    });
  });

  // ─── findMine ─────────────────────────────────────────────────────────────

  describe('findMine', () => {
    it('should return items for the given restaurantId', async () => {
      prisma.foodMenu.findMany.mockResolvedValue([mockFoodMenuItem]);

      const result = await service.findMine(5);

      expect(prisma.foodMenu.findMany).toHaveBeenCalledWith({
        where: { restaurantId: 5 },
        include: { category: true },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual([mockFoodMenuItem]);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return the menu item with restaurant relation', async () => {
      const withRestaurant = { ...mockFoodMenuItem, restaurant: { id: 5, name: 'Test' } };
      prisma.foodMenu.findUnique.mockResolvedValue(withRestaurant);

      const result = await service.findOne(1);

      expect(prisma.foodMenu.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { restaurant: true },
      });
      expect(result).toEqual(withRestaurant);
    });

    it('should throw NotFoundException when item is not found', async () => {
      prisma.foodMenu.findUnique.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    const dto: CreateFoodmenuDto = {
      name: 'Updated Jollof',
      price: 18.99,
      description: 'Updated',
      categoryId: 3,
    };

    it('should update when ownership is confirmed', async () => {
      // First findUnique call: ownership check
      prisma.foodMenu.findUnique.mockResolvedValueOnce({ restaurantId: 5 });
      const updated = { ...mockFoodMenuItem, name: 'Updated Jollof' };
      prisma.foodMenu.update.mockResolvedValue(updated);

      const result = await service.update(5, 1, dto);

      expect(prisma.foodMenu.update).toHaveBeenCalledWith({ where: { id: 1 }, data: dto });
      expect(result).toEqual(updated);
    });

    it('should throw ForbiddenException when item belongs to different restaurant', async () => {
      prisma.foodMenu.findUnique.mockResolvedValue({ restaurantId: 99 });
      await expect(service.update(5, 1, dto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when item does not exist', async () => {
      prisma.foodMenu.findUnique.mockResolvedValue(null);
      await expect(service.update(5, 999, dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete the item when ownership is confirmed', async () => {
      prisma.foodMenu.findUnique.mockResolvedValue({ restaurantId: 5 });
      prisma.foodMenu.delete.mockResolvedValue(mockFoodMenuItem);

      const result = await service.remove(5, 1);

      expect(prisma.foodMenu.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual({ message: 'Menu item deleted' });
    });

    it('should throw ForbiddenException when item belongs to different restaurant', async () => {
      prisma.foodMenu.findUnique.mockResolvedValue({ restaurantId: 99 });
      await expect(service.remove(5, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when item does not exist', async () => {
      prisma.foodMenu.findUnique.mockResolvedValue(null);
      await expect(service.remove(5, 999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAllByCategory ────────────────────────────────────────────────────

  describe('findAllByCategory', () => {
    it('should filter by categoryId and isAvailable=true', async () => {
      prisma.foodMenu.findMany.mockResolvedValue([mockFoodMenuItem]);

      await service.findAllByCategory(3, true);

      expect(prisma.foodMenu.findMany).toHaveBeenCalledWith({
        where: { categoryId: 3, isAvailable: true },
        include: { category: true },
      });
    });

    it('should filter by categoryId only when isAvailable not provided', async () => {
      prisma.foodMenu.findMany.mockResolvedValue([mockFoodMenuItem]);

      await service.findAllByCategory(3);

      expect(prisma.foodMenu.findMany).toHaveBeenCalledWith({
        where: { categoryId: 3 },
        include: { category: true },
      });
    });
  });

  // ─── findTotalFoodMenu ────────────────────────────────────────────────────

  describe('findTotalFoodMenu', () => {
    it('should return total count', async () => {
      prisma.foodMenu.count.mockResolvedValue(25);
      expect(await service.findTotalFoodMenu()).toBe(25);
    });
  });
});
