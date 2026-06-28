import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException } from '@nestjs/common';
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
  restaurantId: 42,
  categoryId: 3,
  isAvailable: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockFoodMenuItemWithRestaurant = {
  ...mockFoodMenuItem,
  restaurant: {
    id: 42,
    name: 'Test Restaurant',
  },
};

const mockFoodMenuItemWithCategory = {
  ...mockFoodMenuItem,
  category: {
    id: 3,
    name: 'Main Course',
  },
};

const mockPrismaService = {
  foodMenu: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
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
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FoodmenuService>(FoodmenuService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    const baseDto: CreateFoodmenuDto = {
      name: 'Jollof Rice',
      price: 15.99,
      quantity: 10,
      imageUrl: 'https://example.com/jollof.jpg',
      description: 'West African classic',
      userAccountId: 99,
      categoryId: 3,
    };

    it('should create a food menu item and strip userAccountId (uses restaurantId from dto)', async () => {
      const dto = { ...baseDto, restaurantId: 42 } as any;
      prisma.foodMenu.create.mockResolvedValue(mockFoodMenuItem);

      const result = await service.create(dto);

      expect(prisma.foodMenu.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          price: dto.price,
          quantity: dto.quantity,
          imageUrl: dto.imageUrl,
          description: dto.description,
          categoryId: dto.categoryId,
          restaurantId: 42,
        },
      });
      expect(result).toEqual(mockFoodMenuItem);
    });

    it('should fall back to userAccountId when restaurantId is absent', async () => {
      const dto = { ...baseDto } as any;
      prisma.foodMenu.create.mockResolvedValue({
        ...mockFoodMenuItem,
        restaurantId: 99,
      });

      await service.create(dto);

      const callArg = prisma.foodMenu.create.mock.calls[0][0];
      expect(callArg.data.restaurantId).toBe(99);
      expect(callArg.data.userAccountId).toBeUndefined();
    });

    it('should fall back to 1 when both restaurantId and userAccountId are absent', async () => {
      const dto = { ...baseDto, userAccountId: undefined } as any;
      prisma.foodMenu.create.mockResolvedValue({
        ...mockFoodMenuItem,
        restaurantId: 1,
      });

      await service.create(dto);

      const callArg = prisma.foodMenu.create.mock.calls[0][0];
      expect(callArg.data.restaurantId).toBe(1);
    });

    it('should throw and log error when prisma.create fails', async () => {
      const error = new Error('DB error');
      prisma.foodMenu.create.mockRejectedValue(error);

      await expect(service.create(baseDto)).rejects.toThrow('DB error');
    });
  });

  // ─── findAll ─────────────────────────────────────────────────────────────────

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

      expect(prisma.foodMenu.findMany).toHaveBeenCalledWith({
        where: { isAvailable: true },
      });
    });

    it('should filter by isAvailable=false', async () => {
      prisma.foodMenu.findMany.mockResolvedValue([]);

      await service.findAll({ isAvailable: false });

      expect(prisma.foodMenu.findMany).toHaveBeenCalledWith({
        where: { isAvailable: false },
      });
    });

    it('should filter by restaurantId', async () => {
      prisma.foodMenu.findMany.mockResolvedValue([mockFoodMenuItem]);

      await service.findAll({ restaurantId: 42 });

      expect(prisma.foodMenu.findMany).toHaveBeenCalledWith({
        where: { restaurantId: 42 },
      });
    });

    it('should filter by categoryId', async () => {
      prisma.foodMenu.findMany.mockResolvedValue([mockFoodMenuItem]);

      await service.findAll({ categoryId: 3 });

      expect(prisma.foodMenu.findMany).toHaveBeenCalledWith({
        where: { categoryId: 3 },
      });
    });

    it('should apply all filters together', async () => {
      prisma.foodMenu.findMany.mockResolvedValue([mockFoodMenuItem]);

      await service.findAll({ isAvailable: true, restaurantId: 42, categoryId: 3 });

      expect(prisma.foodMenu.findMany).toHaveBeenCalledWith({
        where: { isAvailable: true, restaurantId: 42, categoryId: 3 },
      });
    });

    it('should throw and log error when prisma.findMany fails', async () => {
      const error = new Error('DB error');
      prisma.foodMenu.findMany.mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow('DB error');
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a food menu item with restaurant relation when found', async () => {
      prisma.foodMenu.findUniqueOrThrow.mockResolvedValue(
        mockFoodMenuItemWithRestaurant,
      );

      const result = await service.findOne(1);

      expect(prisma.foodMenu.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { restaurant: true },
      });
      expect(result).toEqual(mockFoodMenuItemWithRestaurant);
    });

    it('should throw NotFoundException when item is not found', async () => {
      prisma.foodMenu.findUniqueOrThrow.mockRejectedValue(
        new Error('Record not found'),
      );

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Failed to fetch menu item with ID: 999 not found',
      );
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    const updateDto: CreateFoodmenuDto = {
      name: 'Updated Jollof Rice',
      price: 18.99,
      quantity: 5,
      imageUrl: 'https://example.com/updated.jpg',
      description: 'Updated description',
      userAccountId: 99,
      categoryId: 3,
    };

    it('should update a food menu item and strip userAccountId', async () => {
      const updatedItem = { ...mockFoodMenuItem, name: 'Updated Jollof Rice', price: 18.99 };
      prisma.foodMenu.update.mockResolvedValue(updatedItem);

      const result = await service.update(1, updateDto);

      expect(prisma.foodMenu.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: updateDto.name,
          price: updateDto.price,
          quantity: updateDto.quantity,
          imageUrl: updateDto.imageUrl,
          description: updateDto.description,
          categoryId: updateDto.categoryId,
        },
      });
      const callArg = prisma.foodMenu.update.mock.calls[0][0];
      expect(callArg.data.userAccountId).toBeUndefined();
      expect(result).toEqual(updatedItem);
    });

    it('should throw and log error when prisma.update fails', async () => {
      const error = new Error('Update failed');
      prisma.foodMenu.update.mockRejectedValue(error);

      await expect(service.update(1, updateDto)).rejects.toThrow('Update failed');
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete and return the deleted food menu item', async () => {
      prisma.foodMenu.delete.mockResolvedValue(mockFoodMenuItem);

      const result = await service.remove(1);

      expect(prisma.foodMenu.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockFoodMenuItem);
    });

    it('should throw and log error when prisma.delete fails', async () => {
      const error = new Error('Delete failed');
      prisma.foodMenu.delete.mockRejectedValue(error);

      await expect(service.remove(1)).rejects.toThrow('Delete failed');
    });
  });

  // ─── findAllByCategory ───────────────────────────────────────────────────────

  describe('findAllByCategory', () => {
    it('should return items filtered by categoryId and isAvailable=true', async () => {
      prisma.foodMenu.findMany.mockResolvedValue([mockFoodMenuItemWithCategory]);

      const result = await service.findAllByCategory(3, true);

      expect(prisma.foodMenu.findMany).toHaveBeenCalledWith({
        where: { categoryId: 3, isAvailable: true },
        include: { category: true },
      });
      expect(result).toEqual([mockFoodMenuItemWithCategory]);
    });

    it('should return items filtered by categoryId and isAvailable=false', async () => {
      prisma.foodMenu.findMany.mockResolvedValue([]);

      await service.findAllByCategory(3, false);

      expect(prisma.foodMenu.findMany).toHaveBeenCalledWith({
        where: { categoryId: 3, isAvailable: false },
        include: { category: true },
      });
    });

    it('should return items filtered by categoryId only when isAvailable is not provided', async () => {
      prisma.foodMenu.findMany.mockResolvedValue([mockFoodMenuItemWithCategory]);

      await service.findAllByCategory(3);

      expect(prisma.foodMenu.findMany).toHaveBeenCalledWith({
        where: { categoryId: 3 },
        include: { category: true },
      });
    });

    it('should throw and log error when prisma.findMany fails', async () => {
      const error = new Error('DB error');
      prisma.foodMenu.findMany.mockRejectedValue(error);

      await expect(service.findAllByCategory(3)).rejects.toThrow('DB error');
    });
  });

  // ─── findTotalFoodMenu ───────────────────────────────────────────────────────

  describe('findTotalFoodMenu', () => {
    it('should return the total count of food menu items', async () => {
      prisma.foodMenu.count.mockResolvedValue(25);

      const result = await service.findTotalFoodMenu();

      expect(prisma.foodMenu.count).toHaveBeenCalled();
      expect(result).toBe(25);
    });

    it('should return zero when there are no food menu items', async () => {
      prisma.foodMenu.count.mockResolvedValue(0);

      const result = await service.findTotalFoodMenu();

      expect(result).toBe(0);
    });
  });
});
