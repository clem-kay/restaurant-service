import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

describe('CategoryController', () => {
  let controller: CategoryController;
  let service: CategoryService;

  const mockCategoryService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
      ],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
    service = module.get<CategoryService>(CategoryService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call categoryService.create with the provided dto', async () => {
      const dto: CreateCategoryDto = {
        name: 'Appetizers',
        description: 'Starter dishes',
      };
      const result = { id: 1, ...dto, restaurantId: 1 };
      mockCategoryService.create.mockResolvedValue(result);

      const response = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(response).toEqual(result);
    });
  });

  describe('findAll', () => {
    it('should call categoryService.findAll with the numeric restaurantId when restaurantId is provided', async () => {
      const result = [{ id: 1, name: 'Appetizers', restaurantId: 1 }];
      mockCategoryService.findAll.mockResolvedValue(result);

      const response = await controller.findAll('1');

      expect(service.findAll).toHaveBeenCalledWith(1);
      expect(response).toEqual(result);
    });

    it('should call categoryService.findAll with undefined when restaurantId is not provided', async () => {
      const result = [
        { id: 1, name: 'Appetizers', restaurantId: 1 },
        { id: 2, name: 'Mains', restaurantId: 2 },
      ];
      mockCategoryService.findAll.mockResolvedValue(result);

      const response = await controller.findAll(undefined);

      expect(service.findAll).toHaveBeenCalledWith(undefined);
      expect(response).toEqual(result);
    });
  });

  describe('findOne', () => {
    it('should call categoryService.findOne with the numeric id', async () => {
      const result = { id: 1, name: 'Appetizers', description: 'Starter dishes', restaurantId: 1 };
      mockCategoryService.findOne.mockResolvedValue(result);

      const response = await controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(response).toEqual(result);
    });
  });

  describe('update', () => {
    it('should call categoryService.update with the numeric id and dto', async () => {
      const dto: UpdateCategoryDto = { name: 'Starters' };
      const result = { id: 1, name: 'Starters', description: 'Starter dishes', restaurantId: 1 };
      mockCategoryService.update.mockResolvedValue(result);

      const response = await controller.update('1', dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(response).toEqual(result);
    });
  });

  describe('remove', () => {
    it('should call categoryService.remove with the numeric id', async () => {
      const result = { message: 'success' };
      mockCategoryService.remove.mockResolvedValue(result);

      const response = await controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(response).toEqual(result);
    });
  });
});
