import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRiderDto, UpdateRiderDto } from './dto/create-rider.dto';

@Injectable()
export class RiderService {
  private readonly logger = new Logger(RiderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async register(accountId: number, dto: CreateRiderDto) {
    this.logger.log(`Registering rider profile for accountId=${accountId}`);
    const existing = await this.prisma.rider.findUnique({ where: { accountId } });
    if (existing) throw new BadRequestException('Rider profile already exists');

    const rider = await this.prisma.rider.create({
      data: { ...dto, accountId },
    });

    this.logger.log(`Rider profile created: id=${rider.id}`);
    return rider;
  }

  async getProfile(accountId: number) {
    this.logger.log(`Fetching rider profile for accountId=${accountId}`);
    const rider = await this.prisma.rider.findUnique({
      where: { accountId },
      include: { account: { include: { profile: true } } },
    });
    if (!rider) throw new NotFoundException('Rider profile not found');
    return rider;
  }

  async updateProfile(accountId: number, dto: UpdateRiderDto) {
    this.logger.log(`Updating rider profile for accountId=${accountId}`);
    const rider = await this.prisma.rider.findUnique({ where: { accountId } });
    if (!rider) throw new NotFoundException('Rider profile not found');

    return this.prisma.rider.update({ where: { id: rider.id }, data: dto });
  }

  async toggleAvailability(accountId: number, isAvailable: boolean) {
    this.logger.log(`Setting isAvailable=${isAvailable} for accountId=${accountId}`);
    const rider = await this.prisma.rider.findUnique({ where: { accountId } });
    if (!rider) throw new NotFoundException('Rider profile not found');

    return this.prisma.rider.update({ where: { id: rider.id }, data: { isAvailable } });
  }

  async getDeliveries(accountId: number) {
    this.logger.log(`Fetching deliveries for accountId=${accountId}`);
    const rider = await this.prisma.rider.findUnique({ where: { accountId } });
    if (!rider) throw new NotFoundException('Rider profile not found');

    return this.prisma.delivery.findMany({
      where: { riderId: rider.id },
      include: {
        order: {
          select: {
            id: true,
            totalAmount: true,
            createdAt: true,
            restaurant: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEarnings(accountId: number) {
    this.logger.log(`Fetching earnings for accountId=${accountId}`);
    const rider = await this.prisma.rider.findUnique({ where: { accountId } });
    if (!rider) throw new NotFoundException('Rider profile not found');

    const totalDeliveries = await this.prisma.delivery.count({ where: { riderId: rider.id } });
    return { totalEarnings: rider.totalEarnings, totalDeliveries };
  }

  async findAll(filters: { isApproved?: boolean; isAvailable?: boolean } = {}) {
    this.logger.log(`Admin: fetching all riders with filters=${JSON.stringify(filters)}`);
    const where: any = {};
    if (filters.isApproved !== undefined) where.isApproved = filters.isApproved;
    if (filters.isAvailable !== undefined) where.isAvailable = filters.isAvailable;

    return this.prisma.rider.findMany({
      where,
      include: { account: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    this.logger.log(`Admin: fetching rider id=${id}`);
    const rider = await this.prisma.rider.findUnique({
      where: { id },
      include: {
        account: { include: { profile: true } },
        deliveries: true,
      },
    });
    if (!rider) throw new NotFoundException(`Rider with id=${id} not found`);
    return rider;
  }

  async setApproval(riderId: number, approve: boolean) {
    this.logger.log(`Setting approval=${approve} for riderId=${riderId}`);
    const rider = await this.prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException(`Rider with id=${riderId} not found`);

    const updated = await this.prisma.rider.update({
      where: { id: riderId },
      data: { isApproved: approve },
    });

    this.logger.log(`Rider ${riderId} ${approve ? 'approved' : 'rejected'}`);
    return updated;
  }
}
