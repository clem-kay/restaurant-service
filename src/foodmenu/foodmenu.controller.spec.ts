import { Test, TestingModule } from '@nestjs/testing';
import { FoodmenuController } from './foodmenu.controller';
import { FoodmenuService } from './foodmenu.service';
import { CreateFoodmenuDto } from './dto/create-foodmenu.dto';

const mockFoodmenuService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  findAllByCategory: jest.fn(),
};

describe('FoodmenuController', () => {
  let controller: FoodmenuController;
  let service: typeof mockFoodmenuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoodmenuController],
      providers: [
        {
          provide: FoodmenuService,
          useValue: mockFoodmenuService,
        },
      ],
    }).compile();

    controller = module.get<FoodmenuController>(FoodmenuController);
    service = module.get(FoodmenuService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should call service.create with the provided dto', () => {
      const dto: CreateFoodmenuDto = {
        name: 'Jollof Rice',
        price: 15.99,
        quantity: 10,
        imageUrl: 'https://example.com/jollof.jpg',
        description: 'West African classic',
        userAccountId: 99,
        categoryId: 3,
      };
      const expected = { id: 1, ...dto };
      service.create.mockReturnValue(expected);

      const result = controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  // ─── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should call service.findAll with { isAvailable: true } when isAvailable="true"', () => {
      service.findAll.mockReturnValue([]);

      controller.findAll('true', undefined, undefined);

      expect(service.findAll).toHaveBeenCalledWith({
        isAvailable: true,
        restaurantId: undefined,
        categoryId: undefined,
      });
    });

    it('should call service.findAll with { isAvailable: false } when isAvailable="false"', () => {
      service.findAll.mockReturnValue([]);

      controller.findAll('false', undefined, undefined);

      expect(service.findAll).toHaveBeenCalledWith({
        isAvailable: false,
        restaurantId: undefined,
        categoryId: undefined,
      });
    });

    it('should call service.findAll with { isAvailable: undefined } when isAvailable is undefined', () => {
      service.findAll.mockReturnValue([]);

      controller.findAll(undefined, undefined, undefined);

      expect(service.findAll).toHaveBeenCalledWith({
        isAvailable: undefined,
        restaurantId: undefined,
        categoryId: undefined,
      });
    });

    it('should call service.findAll with { restaurantId: 1 } when restaurantId="1"', () => {
      service.findAll.mockReturnValue([]);

      controller.findAll(undefined, '1', undefined);

      expect(service.findAll).toHaveBeenCalledWith({
        isAvailable: undefined,
        restaurantId: 1,
        categoryId: undefined,
      });
    });

    it('should call service.findAll with { categoryId: 2 } when categoryId="2"', () => {
      service.findAll.mockReturnValue([]);

      controller.findAll(undefined, undefined, '2');

      expect(service.findAll).toHaveBeenCalledWith({
        isAvailable: undefined,
        restaurantId: undefined,
        categoryId: 2,
      });
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should call service.findOne with the numeric id', () => {
      const expected = { id: 1, name: 'Jollof Rice' };
      service.findOne.mockReturnValue(expected);

      const result = controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(expected);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should call service.update with the numeric id and dto', () => {
      const dto: CreateFoodmenuDto = {
        name: 'Updated Jollof Rice',
        price: 18.99,
        quantity: 5,
        imageUrl: 'https://example.com/updated.jpg',
        description: 'Updated description',
        userAccountId: 99,
        categoryId: 3,
      };
      const expected = { id: 2, ...dto };
      service.update.mockReturnValue(expected);

      const result = controller.update('2', dto);

      expect(service.update).toHaveBeenCalledWith(2, dto);
      expect(result).toEqual(expected);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should call service.remove with the numeric id', () => {
      const expected = { id: 3, name: 'Deleted Item' };
      service.remove.mockReturnValue(expected);

      const result = controller.remove('3');

      expect(service.remove).toHaveBeenCalledWith(3);
      expect(result).toEqual(expected);
    });
  });

  // ─── findAllByCategory ───────────────────────────────────────────────────────

  describe('findAllByCategory', () => {
    it('should call service.findAllByCategory with numeric id and true when isAvailable="true"', () => {
      service.findAllByCategory.mockReturnValue([]);

      controller.findAllByCategory('5', 'true');

      expect(service.findAllByCategory).toHaveBeenCalledWith(5, true);
    });

    it('should call service.findAllByCategory with numeric id and undefined when isAvailable is undefined', () => {
      service.findAllByCategory.mockReturnValue([]);

      controller.findAllByCategory('5', undefined);

      expect(service.findAllByCategory).toHaveBeenCalledWith(5, undefined);
    });
  });
});
