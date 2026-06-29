import { Test, TestingModule } from '@nestjs/testing';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { AtGuard } from 'src/guards/at.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { RestaurantContextGuard } from 'src/guards/restaurant-context.guard';
import {
  CreateCustomerDto,
  CreateAddressDto,
  UpdateAddressDto,
  SubmitRatingDto,
} from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

const mockCustomerService = {
  register: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  addAddress: jest.fn(),
  getAddresses: jest.fn(),
  updateAddress: jest.fn(),
  deleteAddress: jest.fn(),
  setDefaultAddress: jest.fn(),
  getOrders: jest.fn(),
  submitRating: jest.fn(),
  getMyRatings: jest.fn(),
};

const ACCOUNT_ID = 10;

describe('CustomerController', () => {
  let controller: CustomerController;
  let service: typeof mockCustomerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [
        { provide: CustomerService, useValue: mockCustomerService },
      ],
    })
      .overrideGuard(AtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RestaurantContextGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CustomerController>(CustomerController);
    service = module.get(CustomerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('calls service.register with accountId and dto', async () => {
      const dto: CreateCustomerDto = { firstName: 'John', lastName: 'Doe', phone: '+233244000000' };
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
      const expected = { id: 1, firstName: 'John', accountId: ACCOUNT_ID };
      service.getProfile.mockResolvedValue(expected);

      const result = await controller.getProfile(ACCOUNT_ID);

      expect(service.getProfile).toHaveBeenCalledWith(ACCOUNT_ID);
      expect(result).toBe(expected);
    });
  });

  // ─── updateProfile ─────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('calls service.updateProfile with accountId and dto', async () => {
      const dto: UpdateCustomerDto = { firstName: 'Jane' };
      const expected = { id: 1, firstName: 'Jane', accountId: ACCOUNT_ID };
      service.updateProfile.mockResolvedValue(expected);

      const result = await controller.updateProfile(ACCOUNT_ID, dto);

      expect(service.updateProfile).toHaveBeenCalledWith(ACCOUNT_ID, dto);
      expect(result).toBe(expected);
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('calls service.findAll and returns list', async () => {
      const expected = [{ id: 1 }, { id: 2 }];
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toBe(expected);
    });
  });

  // ─── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('calls service.findById with the parsed id', async () => {
      const expected = { id: 1, firstName: 'John' };
      service.findById.mockResolvedValue(expected);

      const result = await controller.findById(1);

      expect(service.findById).toHaveBeenCalledWith(1);
      expect(result).toBe(expected);
    });
  });

  // ─── addAddress ────────────────────────────────────────────────────────────

  describe('addAddress', () => {
    it('calls service.addAddress with accountId and dto', async () => {
      const dto: CreateAddressDto = {
        label: 'Home',
        address: '14 Oxford St, Accra',
        latitude: 5.6037,
        longitude: -0.187,
      };
      const expected = { id: 1, ...dto, customerId: 1 };
      service.addAddress.mockResolvedValue(expected);

      const result = await controller.addAddress(ACCOUNT_ID, dto);

      expect(service.addAddress).toHaveBeenCalledWith(ACCOUNT_ID, dto);
      expect(result).toBe(expected);
    });
  });

  // ─── getAddresses ──────────────────────────────────────────────────────────

  describe('getAddresses', () => {
    it('calls service.getAddresses with accountId', async () => {
      const expected = [{ id: 1, label: 'Home' }];
      service.getAddresses.mockResolvedValue(expected);

      const result = await controller.getAddresses(ACCOUNT_ID);

      expect(service.getAddresses).toHaveBeenCalledWith(ACCOUNT_ID);
      expect(result).toBe(expected);
    });
  });

  // ─── updateAddress ─────────────────────────────────────────────────────────

  describe('updateAddress', () => {
    it('calls service.updateAddress with accountId, addressId, and dto', async () => {
      const dto: UpdateAddressDto = {
        label: 'Work',
        address: '10 Ring Rd',
        latitude: 5.6,
        longitude: -0.19,
      };
      const expected = { id: 1, ...dto, customerId: 1 };
      service.updateAddress.mockResolvedValue(expected);

      const result = await controller.updateAddress(ACCOUNT_ID, 1, dto);

      expect(service.updateAddress).toHaveBeenCalledWith(ACCOUNT_ID, 1, dto);
      expect(result).toBe(expected);
    });
  });

  // ─── deleteAddress ─────────────────────────────────────────────────────────

  describe('deleteAddress', () => {
    it('calls service.deleteAddress with accountId and addressId', async () => {
      const expected = { message: 'Address deleted successfully' };
      service.deleteAddress.mockResolvedValue(expected);

      const result = await controller.deleteAddress(ACCOUNT_ID, 1);

      expect(service.deleteAddress).toHaveBeenCalledWith(ACCOUNT_ID, 1);
      expect(result).toBe(expected);
    });
  });

  // ─── setDefaultAddress ─────────────────────────────────────────────────────

  describe('setDefaultAddress', () => {
    it('calls service.setDefaultAddress with accountId and addressId', async () => {
      const expected = { id: 1, isDefault: true };
      service.setDefaultAddress.mockResolvedValue(expected);

      const result = await controller.setDefaultAddress(ACCOUNT_ID, 1);

      expect(service.setDefaultAddress).toHaveBeenCalledWith(ACCOUNT_ID, 1);
      expect(result).toBe(expected);
    });
  });

  // ─── getOrders ─────────────────────────────────────────────────────────────

  describe('getOrders', () => {
    it('calls service.getOrders with accountId', async () => {
      const expected = [{ id: 1, totalAmount: 50 }];
      service.getOrders.mockResolvedValue(expected);

      const result = await controller.getOrders(ACCOUNT_ID);

      expect(service.getOrders).toHaveBeenCalledWith(ACCOUNT_ID);
      expect(result).toBe(expected);
    });
  });

  // ─── submitRating ──────────────────────────────────────────────────────────

  describe('submitRating', () => {
    it('calls service.submitRating with accountId and dto', async () => {
      const dto: SubmitRatingDto = { orderId: 42, riderScore: 5, foodScore: 4, comment: 'Great!' };
      const expected = { id: 1, orderId: 42, customerId: 1 };
      service.submitRating.mockResolvedValue(expected);

      const result = await controller.submitRating(ACCOUNT_ID, dto);

      expect(service.submitRating).toHaveBeenCalledWith(ACCOUNT_ID, dto);
      expect(result).toBe(expected);
    });
  });

  // ─── getMyRatings ──────────────────────────────────────────────────────────

  describe('getMyRatings', () => {
    it('calls service.getMyRatings with accountId', async () => {
      const expected = [{ id: 1, orderId: 42 }];
      service.getMyRatings.mockResolvedValue(expected);

      const result = await controller.getMyRatings(ACCOUNT_ID);

      expect(service.getMyRatings).toHaveBeenCalledWith(ACCOUNT_ID);
      expect(result).toBe(expected);
    });
  });
});
