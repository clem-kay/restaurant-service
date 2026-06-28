import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';
import { AtGuard } from 'src/guards/at.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';

const mockRestaurantService = {
  findNearby: jest.fn(),
  findMenuByRestaurant: jest.fn(),
  selfRegister: jest.fn(),
  toggleOpen: jest.fn(),
  updateOpeningHours: jest.fn(),
  manualCreate: jest.fn(),
  setApproval: jest.fn(),
  findPendingApprovals: jest.fn(),
  findAll: jest.fn(),
};

describe('RestaurantController', () => {
  let controller: RestaurantController;
  let service: typeof mockRestaurantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RestaurantController],
      providers: [
        { provide: RestaurantService, useValue: mockRestaurantService },
      ],
    })
      .overrideGuard(AtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RestaurantController>(RestaurantController);
    service = module.get(RestaurantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── findNearby ────────────────────────────────────────────────────────────

  describe('findNearby', () => {
    it('should call findNearby with parsed lat, lng and radius when radius is provided', async () => {
      const expected = [{ id: 1, name: 'Test Restaurant' }];
      service.findNearby.mockResolvedValue(expected);

      const result = await controller.findNearby('5.6037', '-0.187', '15');

      expect(service.findNearby).toHaveBeenCalledWith(5.6037, -0.187, 15);
      expect(result).toBe(expected);
    });

    it('should call findNearby with undefined radius when radius is not provided', async () => {
      const expected = [{ id: 2, name: 'Another Restaurant' }];
      service.findNearby.mockResolvedValue(expected);

      const result = await controller.findNearby('5.6037', '-0.187');

      expect(service.findNearby).toHaveBeenCalledWith(5.6037, -0.187, undefined);
      expect(result).toBe(expected);
    });
  });

  // ─── getMenu ───────────────────────────────────────────────────────────────

  describe('getMenu', () => {
    it('should call findMenuByRestaurant with the restaurant id', async () => {
      const expected = { id: 1, name: 'Test Restaurant', categories: [] };
      service.findMenuByRestaurant.mockResolvedValue(expected);

      const result = await controller.getMenu(1);

      expect(service.findMenuByRestaurant).toHaveBeenCalledWith(1);
      expect(result).toBe(expected);
    });
  });

  // ─── selfRegister ──────────────────────────────────────────────────────────

  describe('selfRegister', () => {
    it('should call selfRegister with accountId and dto', async () => {
      const dto: CreateRestaurantDto = {
        name: 'New Restaurant',
        address: '123 Main St',
        latitude: 5.6037,
        longitude: -0.187,
      };
      const expected = { id: 3, ...dto, isApproved: false, message: 'Your restaurant is under review.' };
      service.selfRegister.mockResolvedValue(expected);

      const result = await controller.selfRegister(42, dto);

      expect(service.selfRegister).toHaveBeenCalledWith(42, dto);
      expect(result).toBe(expected);
    });
  });

  // ─── toggleOpen ───────────────────────────────────────────────────────────

  describe('toggleOpen', () => {
    it('should call toggleOpen with ownerId and isOpen', async () => {
      const expected = { id: 1, isOpen: true };
      service.toggleOpen.mockResolvedValue(expected);

      const result = await controller.toggleOpen(10, true);

      expect(service.toggleOpen).toHaveBeenCalledWith(10, true);
      expect(result).toBe(expected);
    });
  });

  // ─── setHours ─────────────────────────────────────────────────────────────

  describe('setHours', () => {
    it('should call updateOpeningHours with ownerId and body.hours', async () => {
      const hours = [
        { dayOfWeek: 1, openTime: '09:00', closeTime: '22:00', isClosed: false },
      ];
      const expected = { count: 1 };
      service.updateOpeningHours.mockResolvedValue(expected);

      const result = await controller.setHours(10, { hours });

      expect(service.updateOpeningHours).toHaveBeenCalledWith(10, hours);
      expect(result).toBe(expected);
    });
  });

  // ─── manualCreate ─────────────────────────────────────────────────────────

  describe('manualCreate', () => {
    it('should call manualCreate with dto', async () => {
      const dto = {
        name: 'Admin Created',
        address: '456 Admin St',
        latitude: 5.6037,
        longitude: -0.187,
        ownerId: 5,
      };
      const expected = { id: 4, ...dto, isApproved: true };
      service.manualCreate.mockResolvedValue(expected);

      const result = await controller.manualCreate(dto);

      expect(service.manualCreate).toHaveBeenCalledWith(dto);
      expect(result).toBe(expected);
    });
  });

  // ─── approve ──────────────────────────────────────────────────────────────

  describe('approve', () => {
    it('should call setApproval with id and approve', async () => {
      const expected = { id: 3, isApproved: true };
      service.setApproval.mockResolvedValue(expected);

      const result = await controller.approve(3, true);

      expect(service.setApproval).toHaveBeenCalledWith(3, true);
      expect(result).toBe(expected);
    });
  });

  // ─── pending ──────────────────────────────────────────────────────────────

  describe('pending', () => {
    it('should call findPendingApprovals', async () => {
      const expected = [{ id: 5, isApproved: false }];
      service.findPendingApprovals.mockResolvedValue(expected);

      const result = await controller.pending();

      expect(service.findPendingApprovals).toHaveBeenCalled();
      expect(result).toBe(expected);
    });
  });

  // ─── all ──────────────────────────────────────────────────────────────────

  describe('all', () => {
    it('should call findAll with { isApproved: true } when isApproved is "true"', async () => {
      const expected = [{ id: 1, isApproved: true }];
      service.findAll.mockResolvedValue(expected);

      const result = await controller.all('true', undefined);

      expect(service.findAll).toHaveBeenCalledWith({ isApproved: true, isOpen: undefined });
      expect(result).toBe(expected);
    });

    it('should call findAll with { isApproved: false } when isApproved is "false"', async () => {
      const expected = [{ id: 2, isApproved: false }];
      service.findAll.mockResolvedValue(expected);

      const result = await controller.all('false', undefined);

      expect(service.findAll).toHaveBeenCalledWith({ isApproved: false, isOpen: undefined });
      expect(result).toBe(expected);
    });

    it('should call findAll with { isApproved: undefined } when isApproved is not provided', async () => {
      const expected = [{ id: 1 }, { id: 2 }];
      service.findAll.mockResolvedValue(expected);

      const result = await controller.all(undefined, undefined);

      expect(service.findAll).toHaveBeenCalledWith({ isApproved: undefined, isOpen: undefined });
      expect(result).toBe(expected);
    });

    it('should call findAll with { isOpen: true } when isOpen is "true"', async () => {
      const expected = [{ id: 1, isOpen: true }];
      service.findAll.mockResolvedValue(expected);

      const result = await controller.all(undefined, 'true');

      expect(service.findAll).toHaveBeenCalledWith({ isApproved: undefined, isOpen: true });
      expect(result).toBe(expected);
    });
  });
});
