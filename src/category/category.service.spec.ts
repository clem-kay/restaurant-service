import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { CategoryService } from './category.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const mockPrismaService = {
  foodCategory: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  foodMenu: {
    deleteMany: jest.fn(),
  },
};

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreateCategoryDto = { name: 'Starters', description: 'Appetizers and starters' };

    it('should create a category scoped to the given restaurantId', async () => {
      const created = { id: 1, ...dto, restaurantId: 5 };
      mockPrismaService.foodCategory.create.mockResolvedValue(created);

      const result = await service.create(5, dto);

      expect(mockPrismaService.foodCategory.create).toHaveBeenCalledWith({
        data: { name: dto.name, description: dto.description, restaurantId: 5 },
      });
      expect(result).toEqual(created);
    });

    it('should throw when prisma.foodCategory.create rejects', async () => {
      mockPrismaService.foodCategory.create.mockRejectedValue(new Error('DB error'));
      await expect(service.create(5, dto)).rejects.toThrow('DB error');
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    const raw = [
      { id: 1, name: 'Starters', restaurantId: 1, _count: { menu: 3 } },
      { id: 2, name: 'Mains', restaurantId: 1, _count: { menu: 5 } },
    ];

    it('should return all categories with menuCount when no restaurantId', async () => {
      mockPrismaService.foodCategory.findMany.mockResolvedValue(raw);

      const result = await service.findAll();

      expect(mockPrismaService.foodCategory.findMany).toHaveBeenCalledWith({
        where: {},
        include: { _count: { select: { menu: true } } },
      });
      expect(result[0].menuCount).toBe(3);
      expect(result[1].menuCount).toBe(5);
    });

    it('should filter by restaurantId when provided', async () => {
      mockPrismaService.foodCategory.findMany.mockResolvedValue(raw);

      await service.findAll(1);

      expect(mockPrismaService.foodCategory.findMany).toHaveBeenCalledWith({
        where: { restaurantId: 1 },
        include: { _count: { select: { menu: true } } },
      });
    });

    it('should return empty array when no categories exist', async () => {
      mockPrismaService.foodCategory.findMany.mockResolvedValue([]);
      expect(await service.findAll()).toEqual([]);
    });
  });

  // ─── findMine ─────────────────────────────────────────────────────────────

  describe('findMine', () => {
    it('should return categories for the given restaurantId', async () => {
      const raw = [{ id: 1, name: 'Starters', restaurantId: 5, _count: { menu: 2 } }];
      mockPrismaService.foodCategory.findMany.mockResolvedValue(raw);

      const result = await service.findMine(5);

      expect(mockPrismaService.foodCategory.findMany).toHaveBeenCalledWith({
        where: { restaurantId: 5 },
        include: { _count: { select: { menu: true } } },
        orderBy: { createdAt: 'asc' },
      });
      expect(result[0].menuCount).toBe(2);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return the category when found', async () => {
      const category = { id: 1, name: 'Starters', restaurantId: 5 };
      mockPrismaService.foodCategory.findUnique.mockResolvedValue(category);

      const result = await service.findOne(1);

      expect(mockPrismaService.foodCategory.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(category);
    });

    it('should throw NotFoundException when category not found', async () => {
      mockPrismaService.foodCategory.findUnique.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    const dto: UpdateCategoryDto = { name: 'Updated Name' };

    it('should update the category when ownership is confirmed', async () => {
      mockPrismaService.foodCategory.findUnique.mockResolvedValue({ restaurantId: 5 });
      const updated = { id: 1, name: 'Updated Name', restaurantId: 5 };
      mockPrismaService.foodCategory.update.mockResolvedValue(updated);

      const result = await service.update(5, 1, dto);

      expect(mockPrismaService.foodCategory.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
      });
      expect(result).toEqual(updated);
    });

    it('should throw ForbiddenException when category belongs to different restaurant', async () => {
      mockPrismaService.foodCategory.findUnique.mockResolvedValue({ restaurantId: 99 });
      await expect(service.update(5, 1, dto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockPrismaService.foodCategory.findUnique.mockResolvedValue(null);
      await expect(service.update(5, 999, dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete menu items and category when ownership confirmed', async () => {
      mockPrismaService.foodCategory.findUnique.mockResolvedValue({ restaurantId: 5 });
      mockPrismaService.foodMenu.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaService.foodCategory.delete.mockResolvedValue({ id: 1 });

      const result = await service.remove(5, 1);

      expect(mockPrismaService.foodMenu.deleteMany).toHaveBeenCalledWith({ where: { categoryId: 1 } });
      expect(mockPrismaService.foodCategory.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual({ message: 'Category deleted' });
    });

    it('should throw ForbiddenException when category belongs to different restaurant', async () => {
      mockPrismaService.foodCategory.findUnique.mockResolvedValue({ restaurantId: 99 });
      await expect(service.remove(5, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockPrismaService.foodCategory.findUnique.mockResolvedValue(null);
      await expect(service.remove(5, 999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findTotalCategories ──────────────────────────────────────────────────

  describe('findTotalCategories', () => {
    it('should return total count', async () => {
      mockPrismaService.foodCategory.count.mockResolvedValue(7);
      expect(await service.findTotalCategories()).toBe(7);
    });
  });
});
