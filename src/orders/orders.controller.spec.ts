import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ClientOrderDto } from './dto/client-order.dto';
import { AtGuard } from 'src/guards/at.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { RestaurantContextGuard } from 'src/guards/restaurant-context.guard';

const mockOrdersService = {
  getTotalOrderToday: jest.fn(),
  create: jest.fn(),
  createClientOrder: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  updateFoodStatus: jest.fn(),
  updatePayment: jest.fn(),
  handleCheckoutSessionSuccess: jest.fn(),
};

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: typeof mockOrdersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    })
      .overrideGuard(AtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RestaurantContextGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get(OrdersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTotalSalesToday', () => {
    it('should call ordersService.getTotalOrderToday and return its result', async () => {
      const mockResult = [{ id: 1, totalAmount: 100 }];
      mockOrdersService.getTotalOrderToday.mockResolvedValue(mockResult);

      const result = controller.getTotalSalesToday();

      expect(service.getTotalOrderToday).toHaveBeenCalledTimes(1);
      await expect(result).resolves.toEqual(mockResult);
    });
  });

  describe('create', () => {
    it('should call ordersService.create with the provided dto and return its result', async () => {
      const dto = { order: { name: 'John' }, orderItems: [] } as unknown as CreateOrderDto;
      const mockResult = { id: 1, ...dto };
      mockOrdersService.create.mockResolvedValue(mockResult);

      const result = controller.create(dto);

      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith(dto);
      await expect(result).resolves.toEqual(mockResult);
    });
  });

  describe('createClientOrder', () => {
    it('should call ordersService.createClientOrder with the provided dto and return its result', async () => {
      const dto = { order: { clientName: 'Jane' }, orderItems: [] } as unknown as ClientOrderDto;
      const mockResult = { id: 'session_abc' };
      mockOrdersService.createClientOrder.mockResolvedValue(mockResult);

      const result = controller.createClientOrder(dto);

      expect(service.createClientOrder).toHaveBeenCalledTimes(1);
      expect(service.createClientOrder).toHaveBeenCalledWith(dto);
      await expect(result).resolves.toEqual(mockResult);
    });
  });

  describe('findAll', () => {
    it('should call ordersService.findAll with all filters when all are provided', async () => {
      const mockResult = { data: [], meta: { total: 0, page: 1, limit: 50 } };
      mockOrdersService.findAll.mockResolvedValue(mockResult);

      const result = controller.findAll(
        1,
        50,
        'PENDING',
        'PAID',
        'CARD',
        '5',
      );

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(service.findAll).toHaveBeenCalledWith(1, 50, {
        foodStatus: 'PENDING',
        paymentStatus: 'PAID',
        paymentMethod: 'CARD',
        restaurantId: 5,
      });
      await expect(result).resolves.toEqual(mockResult);
    });

    it('should call ordersService.findAll with undefined filter values when no filters are provided', async () => {
      const mockResult = { data: [], meta: { total: 0, page: 1, limit: 50 } };
      mockOrdersService.findAll.mockResolvedValue(mockResult);

      const result = controller.findAll(1, 50, undefined, undefined, undefined, undefined);

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(service.findAll).toHaveBeenCalledWith(1, 50, {
        foodStatus: undefined,
        paymentStatus: undefined,
        paymentMethod: undefined,
        restaurantId: undefined,
      });
      await expect(result).resolves.toEqual(mockResult);
    });

    it('should cap limit at 100 when a value greater than 100 is provided', async () => {
      const mockResult = { data: [], meta: { total: 0, page: 1, limit: 100 } };
      mockOrdersService.findAll.mockResolvedValue(mockResult);

      const result = controller.findAll(1, 200, undefined, undefined, undefined, undefined);

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(service.findAll).toHaveBeenCalledWith(1, 100, {
        foodStatus: undefined,
        paymentStatus: undefined,
        paymentMethod: undefined,
        restaurantId: undefined,
      });
      await expect(result).resolves.toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should call ordersService.findOne with the numeric id and return its result', async () => {
      const mockResult = { id: 42, totalAmount: 200 };
      mockOrdersService.findOne.mockResolvedValue(mockResult);

      const result = controller.findOne('42');

      expect(service.findOne).toHaveBeenCalledTimes(1);
      expect(service.findOne).toHaveBeenCalledWith(42);
      await expect(result).resolves.toEqual(mockResult);
    });
  });

  describe('update', () => {
    it('should call ordersService.update with the numeric id and dto, and return its result', async () => {
      const dto = {} as UpdateOrderDto;
      const mockResult = 'This action updates a #7 order';
      mockOrdersService.update.mockReturnValue(mockResult);

      const result = controller.update('7', dto);

      expect(service.update).toHaveBeenCalledTimes(1);
      expect(service.update).toHaveBeenCalledWith(7, dto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('remove', () => {
    it('should call ordersService.remove with the numeric id and return its result', async () => {
      const mockResult = { message: 'Order with ID: 3 has been successfully deleted.' };
      mockOrdersService.remove.mockResolvedValue(mockResult);

      const result = controller.remove('3');

      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(service.remove).toHaveBeenCalledWith(3);
      await expect(result).resolves.toEqual(mockResult);
    });
  });

  describe('updateStatus', () => {
    it('should call ordersService.updateFoodStatus with the numeric id and body, and return its result', async () => {
      const body = { status: 'COOKING' };
      const mockResult = { id: 5, foodStatus: 'COOKING' };
      mockOrdersService.updateFoodStatus.mockResolvedValue(mockResult);

      const result = controller.updateStatus('5', body, 10, 'PLATFORM_ADMIN');

      expect(service.updateFoodStatus).toHaveBeenCalledTimes(1);
      expect(service.updateFoodStatus).toHaveBeenCalledWith(5, 'COOKING', 10, 'PLATFORM_ADMIN');
      await expect(result).resolves.toEqual(mockResult);
    });
  });

  describe('updatePayment', () => {
    it('should call ordersService.updatePayment with the numeric id and body.status, and return its result', async () => {
      const body = { status: true };
      const mockResult = { id: 8, paymentStatus: 'PAID' };
      mockOrdersService.updatePayment.mockResolvedValue(mockResult);

      const result = controller.updatePayment('8', body);

      expect(service.updatePayment).toHaveBeenCalledTimes(1);
      expect(service.updatePayment).toHaveBeenCalledWith(8, true);
      await expect(result).resolves.toEqual(mockResult);
    });
  });

  describe('handleCheckoutSessionSuccess', () => {
    it('should call ordersService.handleCheckoutSessionSuccess with the sessionId and return its result', async () => {
      const sessionId = 'cs_test_abc123';
      const mockResult = { message: 'success', error: '' };
      mockOrdersService.handleCheckoutSessionSuccess.mockResolvedValue(mockResult);

      const result = controller.handleCheckoutSessionSuccess(sessionId);

      expect(service.handleCheckoutSessionSuccess).toHaveBeenCalledTimes(1);
      expect(service.handleCheckoutSessionSuccess).toHaveBeenCalledWith(sessionId);
      await expect(result).resolves.toEqual(mockResult);
    });
  });

  describe('handleCheckoutSessionFailure', () => {
    it('should call ordersService.handleCheckoutSessionSuccess with the sessionId and return its result', async () => {
      const sessionId = 'cs_test_failed456';
      const mockResult = { message: 'success', error: '' };
      mockOrdersService.handleCheckoutSessionSuccess.mockResolvedValue(mockResult);

      const result = controller.handleCheckoutSessionFailure(sessionId);

      expect(service.handleCheckoutSessionSuccess).toHaveBeenCalledTimes(1);
      expect(service.handleCheckoutSessionSuccess).toHaveBeenCalledWith(sessionId);
      await expect(result).resolves.toEqual(mockResult);
    });
  });
});
