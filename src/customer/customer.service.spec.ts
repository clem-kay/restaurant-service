import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { PrismaService } from 'src/prisma/prisma.service';

const mockPrisma = {
  customer: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  customerAddress: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
  },
  rating: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

const baseCustomer = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  phone: '+233244000000',
  accountId: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseAddress = {
  id: 1,
  customerId: 1,
  label: 'Home',
  address: '14 Oxford St, Accra',
  latitude: 5.6037,
  longitude: -0.187,
  isDefault: false,
  createdAt: new Date(),
};

describe('CustomerService', () => {
  let service: CustomerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
  });

  // ─── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    const dto = { firstName: 'John', lastName: 'Doe', phone: '+233244000000' };

    it('throws BadRequestException when customer profile already exists', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);

      await expect(service.register(10, dto)).rejects.toThrow(BadRequestException);
      await expect(service.register(10, dto)).rejects.toThrow('Customer profile already exists');
    });

    it('creates and returns a new customer profile', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      mockPrisma.customer.create.mockResolvedValue(baseCustomer);

      const result = await service.register(10, dto);

      expect(mockPrisma.customer.create).toHaveBeenCalledWith({
        data: { ...dto, accountId: 10 },
      });
      expect(result).toEqual(baseCustomer);
    });
  });

  // ─── getProfile ────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('throws NotFoundException when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(10)).rejects.toThrow(NotFoundException);
    });

    it('returns customer profile with addresses and account', async () => {
      const profile = { ...baseCustomer, addresses: [], account: { profile: null } };
      mockPrisma.customer.findUnique.mockResolvedValue(profile);

      const result = await service.getProfile(10);

      expect(mockPrisma.customer.findUnique).toHaveBeenCalledWith({
        where: { accountId: 10 },
        include: {
          addresses: true,
          account: { include: { profile: true } },
        },
      });
      expect(result).toEqual(profile);
    });
  });

  // ─── updateProfile ─────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    const dto = { firstName: 'Jane' };

    it('throws NotFoundException when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.updateProfile(10, dto)).rejects.toThrow(NotFoundException);
    });

    it('updates and returns the customer profile', async () => {
      const updated = { ...baseCustomer, firstName: 'Jane' };
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.customer.update.mockResolvedValue(updated);

      const result = await service.updateProfile(10, dto);

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: baseCustomer.id },
        data: dto,
      });
      expect(result).toEqual(updated);
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all customers with account info', async () => {
      const customers = [baseCustomer];
      mockPrisma.customer.findMany.mockResolvedValue(customers);

      const result = await service.findAll();

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({
        include: { account: { include: { profile: true } } },
      });
      expect(result).toEqual(customers);
    });
  });

  // ─── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('throws NotFoundException when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.findById(99)).rejects.toThrow(NotFoundException);
    });

    it('returns customer with addresses', async () => {
      const customer = { ...baseCustomer, addresses: [baseAddress] };
      mockPrisma.customer.findUnique.mockResolvedValue(customer);

      const result = await service.findById(1);

      expect(mockPrisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { addresses: true },
      });
      expect(result).toEqual(customer);
    });
  });

  // ─── addAddress ────────────────────────────────────────────────────────────

  describe('addAddress', () => {
    const dto = {
      label: 'Home',
      address: '14 Oxford St',
      latitude: 5.6037,
      longitude: -0.187,
      isDefault: false,
    };

    it('throws NotFoundException when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.addAddress(10, dto)).rejects.toThrow(NotFoundException);
    });

    it('creates address without unsetting defaults when isDefault is false', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.customerAddress.create.mockResolvedValue(baseAddress);

      await service.addAddress(10, dto);

      expect(mockPrisma.customerAddress.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.customerAddress.create).toHaveBeenCalledWith({
        data: { ...dto, customerId: baseCustomer.id },
      });
    });

    it('unsets other defaults when isDefault is true', async () => {
      const defaultDto = { ...dto, isDefault: true };
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.customerAddress.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.customerAddress.create.mockResolvedValue({ ...baseAddress, isDefault: true });

      await service.addAddress(10, defaultDto);

      expect(mockPrisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { customerId: baseCustomer.id },
        data: { isDefault: false },
      });
      expect(mockPrisma.customerAddress.create).toHaveBeenCalledWith({
        data: { ...defaultDto, customerId: baseCustomer.id },
      });
    });
  });

  // ─── getAddresses ──────────────────────────────────────────────────────────

  describe('getAddresses', () => {
    it('throws NotFoundException when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.getAddresses(10)).rejects.toThrow(NotFoundException);
    });

    it('returns addresses sorted by isDefault desc', async () => {
      const addresses = [
        { ...baseAddress, isDefault: true },
        { ...baseAddress, id: 2, isDefault: false },
      ];
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.customerAddress.findMany.mockResolvedValue(addresses);

      const result = await service.getAddresses(10);

      expect(mockPrisma.customerAddress.findMany).toHaveBeenCalledWith({
        where: { customerId: baseCustomer.id },
        orderBy: { isDefault: 'desc' },
      });
      expect(result).toEqual(addresses);
    });
  });

  // ─── updateAddress ─────────────────────────────────────────────────────────

  describe('updateAddress', () => {
    const dto = { label: 'Work', address: '10 Ring Rd', latitude: 5.6, longitude: -0.19 };

    it('throws NotFoundException when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.updateAddress(10, 1, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when address not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.customerAddress.findUnique.mockResolvedValue(null);

      await expect(service.updateAddress(10, 99, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when address belongs to different customer', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.customerAddress.findUnique.mockResolvedValue({ ...baseAddress, customerId: 999 });

      await expect(service.updateAddress(10, 1, dto)).rejects.toThrow(NotFoundException);
    });

    it('updates address without unsetting defaults when isDefault is not true', async () => {
      const updatedAddress = { ...baseAddress, ...dto };
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.customerAddress.findUnique.mockResolvedValue(baseAddress);
      mockPrisma.customerAddress.update.mockResolvedValue(updatedAddress);

      const result = await service.updateAddress(10, 1, dto);

      expect(mockPrisma.customerAddress.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.customerAddress.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
      });
      expect(result).toEqual(updatedAddress);
    });

    it('unsets other defaults when isDefault is true', async () => {
      const defaultDto = { ...dto, isDefault: true };
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.customerAddress.findUnique.mockResolvedValue(baseAddress);
      mockPrisma.customerAddress.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.customerAddress.update.mockResolvedValue({ ...baseAddress, ...defaultDto });

      await service.updateAddress(10, 1, defaultDto);

      expect(mockPrisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { customerId: baseCustomer.id },
        data: { isDefault: false },
      });
    });
  });

  // ─── deleteAddress ─────────────────────────────────────────────────────────

  describe('deleteAddress', () => {
    it('throws NotFoundException when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.deleteAddress(10, 1)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when address not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.customerAddress.findUnique.mockResolvedValue(null);

      await expect(service.deleteAddress(10, 99)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when address belongs to different customer', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.customerAddress.findUnique.mockResolvedValue({ ...baseAddress, customerId: 999 });

      await expect(service.deleteAddress(10, 1)).rejects.toThrow(NotFoundException);
    });

    it('deletes address and returns success message', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.customerAddress.findUnique.mockResolvedValue(baseAddress);
      mockPrisma.customerAddress.delete.mockResolvedValue(baseAddress);

      const result = await service.deleteAddress(10, 1);

      expect(mockPrisma.customerAddress.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual({ message: 'Address deleted successfully' });
    });
  });

  // ─── setDefaultAddress ─────────────────────────────────────────────────────

  describe('setDefaultAddress', () => {
    it('throws NotFoundException when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.setDefaultAddress(10, 1)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when address not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.customerAddress.findUnique.mockResolvedValue(null);

      await expect(service.setDefaultAddress(10, 99)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when address belongs to different customer', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.customerAddress.findUnique.mockResolvedValue({ ...baseAddress, customerId: 999 });

      await expect(service.setDefaultAddress(10, 1)).rejects.toThrow(NotFoundException);
    });

    it('unsets all defaults then sets the target address as default', async () => {
      const updatedAddress = { ...baseAddress, isDefault: true };
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.customerAddress.findUnique.mockResolvedValue(baseAddress);
      mockPrisma.customerAddress.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.customerAddress.update.mockResolvedValue(updatedAddress);

      const result = await service.setDefaultAddress(10, 1);

      expect(mockPrisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { customerId: baseCustomer.id },
        data: { isDefault: false },
      });
      expect(mockPrisma.customerAddress.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isDefault: true },
      });
      expect(result).toEqual(updatedAddress);
    });
  });

  // ─── getOrders ─────────────────────────────────────────────────────────────

  describe('getOrders', () => {
    it('throws NotFoundException when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.getOrders(10)).rejects.toThrow(NotFoundException);
    });

    it('returns orders sorted by createdAt desc', async () => {
      const orders = [{ id: 1, totalAmount: 50, customerId: 1 }];
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.order.findMany.mockResolvedValue(orders);

      const result = await service.getOrders(10);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { customerId: baseCustomer.id },
        include: {
          restaurant: { select: { name: true } },
          orderItems: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(orders);
    });
  });

  // ─── submitRating ──────────────────────────────────────────────────────────

  describe('submitRating', () => {
    const dto = { orderId: 42, riderScore: 5, foodScore: 4, comment: 'Great!' };

    it('throws NotFoundException when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.submitRating(10, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when rating already exists', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.rating.findUnique.mockResolvedValue({ id: 1, orderId: 42 });

      await expect(service.submitRating(10, dto)).rejects.toThrow(BadRequestException);
      await expect(service.submitRating(10, dto)).rejects.toThrow('Rating already submitted');
    });

    it('creates and returns a new rating', async () => {
      const rating = { id: 1, orderId: 42, customerId: 1, riderScore: 5, foodScore: 4, comment: 'Great!' };
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.rating.findUnique.mockResolvedValue(null);
      mockPrisma.rating.create.mockResolvedValue(rating);

      const result = await service.submitRating(10, dto);

      expect(mockPrisma.rating.create).toHaveBeenCalledWith({
        data: {
          orderId: dto.orderId,
          customerId: baseCustomer.id,
          riderScore: dto.riderScore,
          foodScore: dto.foodScore,
          comment: dto.comment,
        },
      });
      expect(result).toEqual(rating);
    });
  });

  // ─── getMyRatings ──────────────────────────────────────────────────────────

  describe('getMyRatings', () => {
    it('throws NotFoundException when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.getMyRatings(10)).rejects.toThrow(NotFoundException);
    });

    it('returns all ratings with order info', async () => {
      const ratings = [{ id: 1, orderId: 42, customerId: 1, order: { id: 42 } }];
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer);
      mockPrisma.rating.findMany.mockResolvedValue(ratings);

      const result = await service.getMyRatings(10);

      expect(mockPrisma.rating.findMany).toHaveBeenCalledWith({
        where: { customerId: baseCustomer.id },
        include: { order: true },
      });
      expect(result).toEqual(ratings);
    });
  });
});
