import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CategoryService } from './category.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const mockPrismaService = {
  foodCategory: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreateCategoryDto = {
      name: 'Starters',
      description: 'Appetizers and starters',
    };

    it('should create a category with the given restaurantId', async () => {
      const created = { id: 1, name: 'Starters', description: 'Appetizers and starters', restaurantId: 5 };
      mockPrismaService.foodCategory.create.mockResolvedValue(created);

      const result = await service.create({ ...dto, restaurantId: 5 });

      expect(mockPrismaService.foodCategory.create).toHaveBeenCalledWith({
        data: { name: dto.name, description: dto.description, restaurantId: 5 },
      });
      expect(result).toEqual(created);
    });

    it('should default restaurantId to 1 when not provided', async () => {
      const created = { id: 2, name: 'Starters', description: 'Appetizers and starters', restaurantId: 1 };
      mockPrismaService.foodCategory.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrismaService.foodCategory.create).toHaveBeenCalledWith({
        data: { name: dto.name, description: dto.description, restaurantId: 1 },
      });
      expect(result).toEqual(created);
    });

    it('should throw when prisma.foodCategory.create rejects', async () => {
      const error = new Error('DB error');
      mockPrismaService.foodCategory.create.mockRejectedValue(error);

      await expect(service.create(dto)).rejects.toThrow('DB error');
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    const rawCategories = [
      { id: 1, name: 'Starters', description: 'Desc', restaurantId: 1, _count: { menu: 3 } },
      { id: 2, name: 'Mains', description: 'Desc', restaurantId: 1, _count: { menu: 5 } },
    ];

    it('should return all categories with menuCount when no restaurantId is provided', async () => {
      mockPrismaService.foodCategory.findMany.mockResolvedValue(rawCategories);

      const result = await service.findAll();

      expect(mockPrismaService.foodCategory.findMany).toHaveBeenCalledWith({
        where: {},
        include: { _count: { select: { menu: true } } },
      });
      expect(result).toEqual([
        { id: 1, name: 'Starters', description: 'Desc', restaurantId: 1, _count: { menu: 3 }, menuCount: 3 },
        { id: 2, name: 'Mains', description: 'Desc', restaurantId: 1, _count: { menu: 5 }, menuCount: 5 },
      ]);
    });

    it('should filter by restaurantId when provided', async () => {
      mockPrismaService.foodCategory.findMany.mockResolvedValue(rawCategories);

      const result = await service.findAll(1);

      expect(mockPrismaService.foodCategory.findMany).toHaveBeenCalledWith({
        where: { restaurantId: 1 },
        include: { _count: { select: { menu: true } } },
      });
      expect(result[0].menuCount).toBe(3);
      expect(result[1].menuCount).toBe(5);
    });

    it('should return an empty array when no categories exist', async () => {
      mockPrismaService.foodCategory.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should throw when prisma.foodCategory.findMany rejects', async () => {
      const error = new Error('findMany error');
      mockPrismaService.foodCategory.findMany.mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow('findMany error');
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return the category with the given id', async () => {
      const category = { id: 1, name: 'Starters', description: 'Desc', restaurantId: 1 };
      mockPrismaService.foodCategory.findUniqueOrThrow.mockResolvedValue(category);

      const result = await service.findOne(1);

      expect(mockPrismaService.foodCategory.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(category);
    });

    it('should throw when prisma.foodCategory.findUniqueOrThrow rejects', async () => {
      const error = new Error('Not found');
      mockPrismaService.foodCategory.findUniqueOrThrow.mockRejectedValue(error);

      await expect(service.findOne(99)).rejects.toThrow('Not found');
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    const dto: UpdateCategoryDto = { name: 'Updated Name' };

    it('should update and return the updated category', async () => {
      const updated = { id: 1, name: 'Updated Name', description: 'Desc', restaurantId: 1 };
      mockPrismaService.foodCategory.update.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(mockPrismaService.foodCategory.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ...dto },
      });
      expect(result).toEqual(updated);
    });

    it('should throw when prisma.foodCategory.update rejects', async () => {
      const error = new Error('Update failed');
      mockPrismaService.foodCategory.update.mockRejectedValue(error);

      await expect(service.update(1, dto)).rejects.toThrow('Update failed');
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete menu items first, then the category, and return { message: "success" }', async () => {
      mockPrismaService.foodMenu.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaService.foodCategory.delete.mockResolvedValue({ id: 1, name: 'Starters' });

      const result = await service.remove(1);

      expect(mockPrismaService.foodMenu.deleteMany).toHaveBeenCalledWith({ where: { categoryId: 1 } });
      expect(mockPrismaService.foodCategory.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual({ message: 'success' });
    });

    it('should throw when prisma.foodMenu.deleteMany rejects', async () => {
      const error = new Error('deleteMany error');
      mockPrismaService.foodMenu.deleteMany.mockRejectedValue(error);

      await expect(service.remove(1)).rejects.toThrow('deleteMany error');
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should throw when prisma.foodCategory.delete rejects', async () => {
      mockPrismaService.foodMenu.deleteMany.mockResolvedValue({ count: 0 });
      const error = new Error('delete error');
      mockPrismaService.foodCategory.delete.mockRejectedValue(error);

      await expect(service.remove(1)).rejects.toThrow('delete error');
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // ─── findTotalCategories ──────────────────────────────────────────────────

  describe('findTotalCategories', () => {
    it('should return the total count of categories', async () => {
      mockPrismaService.foodCategory.count.mockResolvedValue(7);

      const result = await service.findTotalCategories();

      expect(mockPrismaService.foodCategory.count).toHaveBeenCalled();
      expect(result).toBe(7);
    });

    it('should return 0 when there are no categories', async () => {
      mockPrismaService.foodCategory.count.mockResolvedValue(0);

      const result = await service.findTotalCategories();

      expect(result).toBe(0);
    });
  });
});
