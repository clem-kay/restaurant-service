import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateCustomerDto,
  CreateAddressDto,
  UpdateAddressDto,
  SubmitRatingDto,
} from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Register — create Customer profile linked to an existing UserAccount ─────

  async register(accountId: number, dto: CreateCustomerDto) {
    this.logger.log(`Registering customer profile for accountId=${accountId}`);
    try {
      const existing = await this.prisma.customer.findUnique({
        where: { accountId },
      });
      if (existing) {
        throw new BadRequestException('Customer profile already exists');
      }

      const customer = await this.prisma.customer.create({
        data: { ...dto, accountId },
      });

      this.logger.log(`Customer profile created: id=${customer.id}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to register customer for accountId=${accountId}`, error.stack);
      throw error;
    }
  }

  // ─── Get own profile (by accountId from JWT) ──────────────────────────────

  async getProfile(accountId: number) {
    this.logger.log(`Fetching customer profile for accountId=${accountId}`);
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { accountId },
        include: {
          addresses: true,
          account: { include: { profile: true } },
        },
      });

      if (!customer) {
        throw new NotFoundException('Customer profile not found');
      }

      return customer;
    } catch (error) {
      this.logger.error(`Failed to fetch customer profile for accountId=${accountId}`, error.stack);
      throw error;
    }
  }

  // ─── Update own profile ───────────────────────────────────────────────────

  async updateProfile(accountId: number, dto: UpdateCustomerDto) {
    this.logger.log(`Updating customer profile for accountId=${accountId}`);
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { accountId },
      });

      if (!customer) {
        throw new NotFoundException('Customer profile not found');
      }

      const updated = await this.prisma.customer.update({
        where: { id: customer.id },
        data: dto,
      });

      this.logger.log(`Customer profile updated: id=${customer.id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update customer profile for accountId=${accountId}`, error.stack);
      throw error;
    }
  }

  // ─── Admin: list all customers ────────────────────────────────────────────

  async findAll() {
    this.logger.log('Admin: fetching all customers');
    try {
      const customers = await this.prisma.customer.findMany({
        include: {
          account: { include: { profile: true } },
        },
      });

      this.logger.log(`Fetched ${customers.length} customers`);
      return customers;
    } catch (error) {
      this.logger.error('Failed to fetch all customers', error.stack);
      throw error;
    }
  }

  // ─── Admin: find by id ────────────────────────────────────────────────────

  async findById(id: number) {
    this.logger.log(`Admin: fetching customer id=${id}`);
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
        include: { addresses: true },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with id=${id} not found`);
      }

      return customer;
    } catch (error) {
      this.logger.error(`Failed to fetch customer id=${id}`, error.stack);
      throw error;
    }
  }

  // ─── Add address ──────────────────────────────────────────────────────────

  async addAddress(accountId: number, dto: CreateAddressDto) {
    this.logger.log(`Adding address for accountId=${accountId}`);
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { accountId },
      });

      if (!customer) {
        throw new NotFoundException('Customer profile not found');
      }

      if (dto.isDefault === true) {
        await this.prisma.customerAddress.updateMany({
          where: { customerId: customer.id },
          data: { isDefault: false },
        });
      }

      const address = await this.prisma.customerAddress.create({
        data: { ...dto, customerId: customer.id },
      });

      this.logger.log(`Address created: id=${address.id} for customerId=${customer.id}`);
      return address;
    } catch (error) {
      this.logger.error(`Failed to add address for accountId=${accountId}`, error.stack);
      throw error;
    }
  }

  // ─── List addresses for customer ──────────────────────────────────────────

  async getAddresses(accountId: number) {
    this.logger.log(`Fetching addresses for accountId=${accountId}`);
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { accountId },
      });

      if (!customer) {
        throw new NotFoundException('Customer profile not found');
      }

      const addresses = await this.prisma.customerAddress.findMany({
        where: { customerId: customer.id },
        orderBy: { isDefault: 'desc' },
      });

      this.logger.log(`Fetched ${addresses.length} addresses for customerId=${customer.id}`);
      return addresses;
    } catch (error) {
      this.logger.error(`Failed to fetch addresses for accountId=${accountId}`, error.stack);
      throw error;
    }
  }

  // ─── Update address ───────────────────────────────────────────────────────

  async updateAddress(accountId: number, addressId: number, dto: UpdateAddressDto) {
    this.logger.log(`Updating address id=${addressId} for accountId=${accountId}`);
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { accountId },
      });

      if (!customer) {
        throw new NotFoundException('Customer profile not found');
      }

      const address = await this.prisma.customerAddress.findUnique({
        where: { id: addressId },
      });

      if (!address || address.customerId !== customer.id) {
        throw new NotFoundException('Address not found');
      }

      if (dto.isDefault === true) {
        await this.prisma.customerAddress.updateMany({
          where: { customerId: customer.id },
          data: { isDefault: false },
        });
      }

      const updated = await this.prisma.customerAddress.update({
        where: { id: addressId },
        data: dto,
      });

      this.logger.log(`Address updated: id=${addressId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update address id=${addressId} for accountId=${accountId}`, error.stack);
      throw error;
    }
  }

  // ─── Delete address ───────────────────────────────────────────────────────

  async deleteAddress(accountId: number, addressId: number) {
    this.logger.log(`Deleting address id=${addressId} for accountId=${accountId}`);
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { accountId },
      });

      if (!customer) {
        throw new NotFoundException('Customer profile not found');
      }

      const address = await this.prisma.customerAddress.findUnique({
        where: { id: addressId },
      });

      if (!address || address.customerId !== customer.id) {
        throw new NotFoundException('Address not found');
      }

      await this.prisma.customerAddress.delete({ where: { id: addressId } });

      this.logger.log(`Address deleted: id=${addressId}`);
      return { message: 'Address deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete address id=${addressId} for accountId=${accountId}`, error.stack);
      throw error;
    }
  }

  // ─── Set default address ──────────────────────────────────────────────────

  async setDefaultAddress(accountId: number, addressId: number) {
    this.logger.log(`Setting default address id=${addressId} for accountId=${accountId}`);
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { accountId },
      });

      if (!customer) {
        throw new NotFoundException('Customer profile not found');
      }

      const address = await this.prisma.customerAddress.findUnique({
        where: { id: addressId },
      });

      if (!address || address.customerId !== customer.id) {
        throw new NotFoundException('Address not found');
      }

      await this.prisma.customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });

      const updated = await this.prisma.customerAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      });

      this.logger.log(`Default address set: id=${addressId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to set default address id=${addressId} for accountId=${accountId}`, error.stack);
      throw error;
    }
  }

  // ─── Get customer's orders ────────────────────────────────────────────────

  async getOrders(accountId: number) {
    this.logger.log(`Fetching orders for accountId=${accountId}`);
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { accountId },
      });

      if (!customer) {
        throw new NotFoundException('Customer profile not found');
      }

      const orders = await this.prisma.order.findMany({
        where: { customerId: customer.id },
        include: {
          restaurant: { select: { name: true } },
          orderItems: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      this.logger.log(`Fetched ${orders.length} orders for customerId=${customer.id}`);
      return orders;
    } catch (error) {
      this.logger.error(`Failed to fetch orders for accountId=${accountId}`, error.stack);
      throw error;
    }
  }

  // ─── Submit rating ────────────────────────────────────────────────────────

  async submitRating(accountId: number, dto: SubmitRatingDto) {
    this.logger.log(`Submitting rating for accountId=${accountId}, orderId=${dto.orderId}`);
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { accountId },
      });

      if (!customer) {
        throw new NotFoundException('Customer profile not found');
      }

      const existingRating = await this.prisma.rating.findUnique({
        where: { orderId: dto.orderId },
      });

      if (existingRating) {
        throw new BadRequestException('Rating already submitted');
      }

      const rating = await this.prisma.rating.create({
        data: {
          orderId: dto.orderId,
          customerId: customer.id,
          riderScore: dto.riderScore,
          foodScore: dto.foodScore,
          comment: dto.comment,
        },
      });

      this.logger.log(`Rating submitted: id=${rating.id} for orderId=${dto.orderId}`);
      return rating;
    } catch (error) {
      this.logger.error(`Failed to submit rating for accountId=${accountId}`, error.stack);
      throw error;
    }
  }

  // ─── Get own ratings ──────────────────────────────────────────────────────

  async getMyRatings(accountId: number) {
    this.logger.log(`Fetching ratings for accountId=${accountId}`);
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { accountId },
      });

      if (!customer) {
        throw new NotFoundException('Customer profile not found');
      }

      const ratings = await this.prisma.rating.findMany({
        where: { customerId: customer.id },
        include: { order: true },
      });

      this.logger.log(`Fetched ${ratings.length} ratings for customerId=${customer.id}`);
      return ratings;
    } catch (error) {
      this.logger.error(`Failed to fetch ratings for accountId=${accountId}`, error.stack);
      throw error;
    }
  }
}
