import { Test, TestingModule } from '@nestjs/testing';
import { VehicleType } from '@prisma/client';
import { RiderController } from './rider.controller';
import { RiderService } from './rider.service';
import { AtGuard } from 'src/guards/at.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { CreateRiderDto, UpdateRiderDto } from './dto/create-rider.dto';

const mockRiderService = {
  register: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  toggleAvailability: jest.fn(),
  getDeliveries: jest.fn(),
  getEarnings: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  setApproval: jest.fn(),
};

const ACCOUNT_ID = 20;

describe('RiderController', () => {
  let controller: RiderController;
  let service: typeof mockRiderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RiderController],
      providers: [
        { provide: RiderService, useValue: mockRiderService },
      ],
    })
      .overrideGuard(AtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RiderController>(RiderController);
    service = module.get(RiderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('calls service.register with accountId and dto', async () => {
      const dto: CreateRiderDto = {
        firstName: 'James',
        lastName: 'Mensah',
        phone: '+233244111222',
        vehicleType: VehicleType.MOTORCYCLE,
        vehiclePlate: 'GR-1234-22',
      };
      const expected = { id: 1, ...dto, accountId: ACCOUNT_ID };
      service.register.mockResolvedValue(expected);

      const result = await controller.register(ACCOUNT_ID, dto);

      expect(service.register).toHaveBeenCalledWith(ACCOUNT_ID, dto);
      expect(result).toBe(expected);
    });
  });

  // ─── getProfile ────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('calls service.getProfile with accountId', async () => {
      const expected = { id: 1, firstName: 'James', accountId: ACCOUNT_ID };
      service.getProfile.mockResolvedValue(expected);

      const result = await controller.getProfile(ACCOUNT_ID);

      expect(service.getProfile).toHaveBeenCalledWith(ACCOUNT_ID);
      expect(result).toBe(expected);
    });
  });

  // ─── updateProfile ─────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('calls service.updateProfile with accountId and dto', async () => {
      const dto: UpdateRiderDto = { firstName: 'Kwame' };
      const expected = { id: 1, firstName: 'Kwame', accountId: ACCOUNT_ID };
      service.updateProfile.mockResolvedValue(expected);

      const result = await controller.updateProfile(ACCOUNT_ID, dto);

      expect(service.updateProfile).toHaveBeenCalledWith(ACCOUNT_ID, dto);
      expect(result).toBe(expected);
    });
  });

  // ─── toggleAvailability ────────────────────────────────────────────────────

  describe('toggleAvailability', () => {
    it('calls service.toggleAvailability with accountId and isAvailable=true', async () => {
      const expected = { id: 1, isAvailable: true };
      service.toggleAvailability.mockResolvedValue(expected);

      const result = await controller.toggleAvailability(ACCOUNT_ID, true);

      expect(service.toggleAvailability).toHaveBeenCalledWith(ACCOUNT_ID, true);
      expect(result).toBe(expected);
    });

    it('calls service.toggleAvailability with accountId and isAvailable=false', async () => {
      const expected = { id: 1, isAvailable: false };
      service.toggleAvailability.mockResolvedValue(expected);

      const result = await controller.toggleAvailability(ACCOUNT_ID, false);

      expect(service.toggleAvailability).toHaveBeenCalledWith(ACCOUNT_ID, false);
      expect(result).toBe(expected);
    });
  });

  // ─── getDeliveries ─────────────────────────────────────────────────────────

  describe('getDeliveries', () => {
    it('calls service.getDeliveries with accountId', async () => {
      const expected = [{ id: 1, riderId: 1 }];
      service.getDeliveries.mockResolvedValue(expected);

      const result = await controller.getDeliveries(ACCOUNT_ID);

      expect(service.getDeliveries).toHaveBeenCalledWith(ACCOUNT_ID);
      expect(result).toBe(expected);
    });
  });

  // ─── getEarnings ───────────────────────────────────────────────────────────

  describe('getEarnings', () => {
    it('calls service.getEarnings with accountId', async () => {
      const expected = { totalEarnings: 450.5, totalDeliveries: 38 };
      service.getEarnings.mockResolvedValue(expected);

      const result = await controller.getEarnings(ACCOUNT_ID);

      expect(service.getEarnings).toHaveBeenCalledWith(ACCOUNT_ID);
      expect(result).toBe(expected);
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('calls service.findAll with no filters when no query params provided', async () => {
      const expected = [{ id: 1 }, { id: 2 }];
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(undefined, undefined);

      expect(service.findAll).toHaveBeenCalledWith({
        isApproved: undefined,
        isAvailable: undefined,
      });
      expect(result).toBe(expected);
    });

    it('calls service.findAll with isApproved=true when query is "true"', async () => {
      const expected = [{ id: 1, isApproved: true }];
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll('true', undefined);

      expect(service.findAll).toHaveBeenCalledWith({
        isApproved: true,
        isAvailable: undefined,
      });
      expect(result).toBe(expected);
    });

    it('calls service.findAll with isApproved=false when query is "false"', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll('false', undefined);

      expect(service.findAll).toHaveBeenCalledWith({
        isApproved: false,
        isAvailable: undefined,
      });
    });

    it('calls service.findAll with isAvailable=true when query is "true"', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll(undefined, 'true');

      expect(service.findAll).toHaveBeenCalledWith({
        isApproved: undefined,
        isAvailable: true,
      });
    });

    it('calls service.findAll with both filters', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll('true', 'false');

      expect(service.findAll).toHaveBeenCalledWith({
        isApproved: true,
        isAvailable: false,
      });
    });
  });

  // ─── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('calls service.findById with the parsed id', async () => {
      const expected = { id: 1, firstName: 'James' };
      service.findById.mockResolvedValue(expected);

      const result = await controller.findById(1);

      expect(service.findById).toHaveBeenCalledWith(1);
      expect(result).toBe(expected);
    });
  });

  // ─── setApproval ───────────────────────────────────────────────────────────

  describe('setApproval', () => {
    it('calls service.setApproval with riderId and approve=true', async () => {
      const expected = { id: 1, isApproved: true };
      service.setApproval.mockResolvedValue(expected);

      const result = await controller.setApproval(1, true);

      expect(service.setApproval).toHaveBeenCalledWith(1, true);
      expect(result).toBe(expected);
    });

    it('calls service.setApproval with riderId and approve=false', async () => {
      const expected = { id: 1, isApproved: false };
      service.setApproval.mockResolvedValue(expected);

      const result = await controller.setApproval(1, false);

      expect(service.setApproval).toHaveBeenCalledWith(1, false);
      expect(result).toBe(expected);
    });
  });
});
