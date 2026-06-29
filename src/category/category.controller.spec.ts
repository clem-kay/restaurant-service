import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AtGuard } from 'src/guards/at.guard';
import { RestaurantContextGuard } from 'src/guards/restaurant-context.guard';

describe('CategoryController', () => {
  let controller: CategoryController;
  let service: CategoryService;

  const mockCategoryService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findMine: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [{ provide: CategoryService, useValue: mockCategoryService }],
    })
      .overrideGuard(AtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RestaurantContextGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CategoryController>(CategoryController);
    service = module.get<CategoryService>(CategoryService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with restaurantId and dto', async () => {
      const dto: CreateCategoryDto = { name: 'Appetizers', description: 'Starter dishes' };
      const result = { id: 1, ...dto, restaurantId: 5 };
      mockCategoryService.create.mockResolvedValue(result);

      const response = await controller.create(5, dto);

      expect(service.create).toHaveBeenCalledWith(5, dto);
      expect(response).toEqual(result);
    });
  });

  describe('findMine', () => {
    it('should call service.findMine with restaurantId', async () => {
      const result = [{ id: 1, name: 'Appetizers', restaurantId: 5 }];
      mockCategoryService.findMine.mockResolvedValue(result);

      const response = await controller.findMine(5);

      expect(service.findMine).toHaveBeenCalledWith(5);
      expect(response).toEqual(result);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with numeric restaurantId when provided', async () => {
      mockCategoryService.findAll.mockResolvedValue([]);
      await controller.findAll('1');
      expect(service.findAll).toHaveBeenCalledWith(1);
    });

    it('should call service.findAll with undefined when restaurantId is not provided', async () => {
      mockCategoryService.findAll.mockResolvedValue([]);
      await controller.findAll(undefined);
      expect(service.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with the numeric id', async () => {
      const result = { id: 1, name: 'Appetizers', restaurantId: 1 };
      mockCategoryService.findOne.mockResolvedValue(result);

      const response = await controller.findOne(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(response).toEqual(result);
    });
  });

  describe('update', () => {
    it('should call service.update with restaurantId, numeric id, and dto', async () => {
      const dto: UpdateCategoryDto = { name: 'Starters' };
      const result = { id: 1, name: 'Starters', restaurantId: 5 };
      mockCategoryService.update.mockResolvedValue(result);

      const response = await controller.update(5, 1, dto);

      expect(service.update).toHaveBeenCalledWith(5, 1, dto);
      expect(response).toEqual(result);
    });
  });

  describe('remove', () => {
    it('should call service.remove with restaurantId and numeric id', async () => {
      const result = { message: 'Category deleted' };
      mockCategoryService.remove.mockResolvedValue(result);

      const response = await controller.remove(5, 1);

      expect(service.remove).toHaveBeenCalledWith(5, 1);
      expect(response).toEqual(result);
    });
  });
});
