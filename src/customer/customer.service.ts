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

  async register(accountId: number, dto: CreateCustomerDto) {
    this.logger.log(`Registering customer profile for accountId=${accountId}`);
    const existing = await this.prisma.customer.findUnique({ where: { accountId } });
    if (existing) throw new BadRequestException('Customer profile already exists');

    const customer = await this.prisma.customer.create({
      data: { ...dto, accountId },
    });

    this.logger.log(`Customer profile created: id=${customer.id}`);
    return customer;
  }

  async getProfile(accountId: number) {
    this.logger.log(`Fetching customer profile for accountId=${accountId}`);
    const customer = await this.prisma.customer.findUnique({
      where: { accountId },
      include: {
        addresses: true,
        account: { include: { profile: true } },
      },
    });
    if (!customer) throw new NotFoundException('Customer profile not found');
    return customer;
  }

  async updateProfile(accountId: number, dto: UpdateCustomerDto) {
    this.logger.log(`Updating customer profile for accountId=${accountId}`);
    const customer = await this.prisma.customer.findUnique({ where: { accountId } });
    if (!customer) throw new NotFoundException('Customer profile not found');

    return this.prisma.customer.update({ where: { id: customer.id }, data: dto });
  }

  async findAll() {
    this.logger.log('Admin: fetching all customers');
    return this.prisma.customer.findMany({
      include: { account: { include: { profile: true } } },
    });
  }

  async findById(id: number) {
    this.logger.log(`Admin: fetching customer id=${id}`);
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { addresses: true },
    });
    if (!customer) throw new NotFoundException(`Customer with id=${id} not found`);
    return customer;
  }

  async addAddress(accountId: number, dto: CreateAddressDto) {
    this.logger.log(`Adding address for accountId=${accountId}`);
    const customer = await this.prisma.customer.findUnique({ where: { accountId } });
    if (!customer) throw new NotFoundException('Customer profile not found');

    if (dto.isDefault === true) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });
    }

    return this.prisma.customerAddress.create({
      data: { ...dto, customerId: customer.id },
    });
  }

  async getAddresses(accountId: number) {
    this.logger.log(`Fetching addresses for accountId=${accountId}`);
    const customer = await this.prisma.customer.findUnique({ where: { accountId } });
    if (!customer) throw new NotFoundException('Customer profile not found');

    return this.prisma.customerAddress.findMany({
      where: { customerId: customer.id },
      orderBy: { isDefault: 'desc' },
    });
  }

  async updateAddress(accountId: number, addressId: number, dto: UpdateAddressDto) {
    this.logger.log(`Updating address id=${addressId} for accountId=${accountId}`);
    const customer = await this.prisma.customer.findUnique({ where: { accountId } });
    if (!customer) throw new NotFoundException('Customer profile not found');

    const address = await this.prisma.customerAddress.findUnique({ where: { id: addressId } });
    if (!address || address.customerId !== customer.id) throw new NotFoundException('Address not found');

    if (dto.isDefault === true) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });
    }

    return this.prisma.customerAddress.update({ where: { id: addressId }, data: dto });
  }

  async deleteAddress(accountId: number, addressId: number) {
    this.logger.log(`Deleting address id=${addressId} for accountId=${accountId}`);
    const customer = await this.prisma.customer.findUnique({ where: { accountId } });
    if (!customer) throw new NotFoundException('Customer profile not found');

    const address = await this.prisma.customerAddress.findUnique({ where: { id: addressId } });
    if (!address || address.customerId !== customer.id) throw new NotFoundException('Address not found');

    await this.prisma.customerAddress.delete({ where: { id: addressId } });
    return { message: 'Address deleted successfully' };
  }

  async setDefaultAddress(accountId: number, addressId: number) {
    this.logger.log(`Setting default address id=${addressId} for accountId=${accountId}`);
    const customer = await this.prisma.customer.findUnique({ where: { accountId } });
    if (!customer) throw new NotFoundException('Customer profile not found');

    const address = await this.prisma.customerAddress.findUnique({ where: { id: addressId } });
    if (!address || address.customerId !== customer.id) throw new NotFoundException('Address not found');

    await this.prisma.customerAddress.updateMany({
      where: { customerId: customer.id },
      data: { isDefault: false },
    });

    return this.prisma.customerAddress.update({ where: { id: addressId }, data: { isDefault: true } });
  }

  async getOrders(accountId: number) {
    this.logger.log(`Fetching orders for accountId=${accountId}`);
    const customer = await this.prisma.customer.findUnique({ where: { accountId } });
    if (!customer) throw new NotFoundException('Customer profile not found');

    return this.prisma.order.findMany({
      where: { customerId: customer.id },
      include: {
        restaurant: { select: { name: true } },
        orderItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitRating(accountId: number, dto: SubmitRatingDto) {
    this.logger.log(`Submitting rating for accountId=${accountId}, orderId=${dto.orderId}`);
    const customer = await this.prisma.customer.findUnique({ where: { accountId } });
    if (!customer) throw new NotFoundException('Customer profile not found');

    const existingRating = await this.prisma.rating.findUnique({ where: { orderId: dto.orderId } });
    if (existingRating) throw new BadRequestException('Rating already submitted');

    return this.prisma.rating.create({
      data: {
        orderId: dto.orderId,
        customerId: customer.id,
        riderScore: dto.riderScore,
        foodScore: dto.foodScore,
        comment: dto.comment,
      },
    });
  }

  async getMyRatings(accountId: number) {
    this.logger.log(`Fetching ratings for accountId=${accountId}`);
    const customer = await this.prisma.customer.findUnique({ where: { accountId } });
    if (!customer) throw new NotFoundException('Customer profile not found');

    return this.prisma.rating.findMany({
      where: { customerId: customer.id },
      include: { order: true },
    });
  }
}
