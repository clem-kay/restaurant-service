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

  // ─── Register rider profile ───────────────────────────────────────────────

  async register(accountId: number, dto: CreateRiderDto) {
    this.logger.log(`Registering rider profile for accountId=${accountId}`);
    try {
      const existing = await this.prisma.rider.findUnique({
        where: { accountId },
      });

      if (existing) {
        throw new BadRequestException('Rider profile already exists');
      }

      const rider = await this.prisma.rider.create({
        data: { ...dto, accountId },
      });

      this.logger.log(`Rider profile created: id=${rider.id}`);
      return rider;
    } catch (error) {
      this.logger.error(`Failed to register rider for accountId=${accountId}`, error.stack);
      throw error;
    }
  }

  // ─── Get own profile ──────────────────────────────────────────────────────

  async getProfile(accountId: number) {
    this.logger.log(`Fetching rider profile for accountId=${accountId}`);
    try {
      const rider = await this.prisma.rider.findUnique({
        where: { accountId },
        include: {
          account: { include: { profile: true } },
        },
      });

      if (!rider) {
        throw new NotFoundException('Rider profile not found');
      }

      return rider;
    } catch (error) {
      this.logger.error(`Failed to fetch rider profile for accountId=${accountId}`, error.stack);
      throw error;
    }
  }

  // ─── Update own profile ───────────────────────────────────────────────────

  async updateProfile(accountId: number, dto: UpdateRiderDto) {
    this.logger.log(`Updating rider profile for accountId=${accountId}`);
    try {
      const rider = await this.prisma.rider.findUnique({
        where: { accountId },
      });

      if (!rider) {
        throw new NotFoundException('Rider profile not found');
      }

      const updated = await this.prisma.rider.update({
        where: { id: rider.id },
        data: dto,
      });

      this.logger.log(`Rider profile updated: id=${rider.id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update rider profile for accountId=${accountId}`, error.stack);
      throw error;
    }
  }

  // ─── Toggle availability ──────────────────────────────────────────────────

  async toggleAvailability(accountId: number, isAvailable: boolean) {
    this.logger.log(`Setting isAvailable=${isAvailable} for accountId=${accountId}`);
    try {
      const rider = await this.prisma.rider.findUnique({
        where: { accountId },
      });

      if (!rider) {
        throw new NotFoundException('Rider profile not found');
      }

      const updated = await this.prisma.rider.update({
        where: { id: rider.id },
        data: { isAvailable },
      });

      this.logger.log(`Rider availability updated: id=${rider.id}, isAvailable=${isAvailable}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to toggle availability for accountId=${accountId}`, error.stack);
      throw error;
    }
  }

  // ─── Get deliveries ───────────────────────────────────────────────────────

  async getDeliveries(accountId: number) {
    this.logger.log(`Fetching deliveries for accountId=${accountId}`);
    try {
      const rider = await this.prisma.rider.findUnique({
        where: { accountId },
      });

      if (!rider) {
        throw new NotFoundException('Rider profile not found');
      }

      const deliveries = await this.prisma.delivery.findMany({
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

      this.logger.log(`Fetched ${deliveries.length} deliveries for riderId=${rider.id}`);
      return deliveries;
    } catch (error) {
      this.logger.error(`Failed to fetch deliveries for accountId=${accountId}`, error.stack);
      throw error;
    }
  }

  // ─── Get earnings ─────────────────────────────────────────────────────────

  async getEarnings(accountId: number) {
    this.logger.log(`Fetching earnings for accountId=${accountId}`);
    try {
      const rider = await this.prisma.rider.findUnique({
        where: { accountId },
      });

      if (!rider) {
        throw new NotFoundException('Rider profile not found');
      }

      const totalDeliveries = await this.prisma.delivery.count({
        where: { riderId: rider.id },
      });

      this.logger.log(`Fetched earnings for riderId=${rider.id}`);
      return {
        totalEarnings: rider.totalEarnings,
        totalDeliveries,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch earnings for accountId=${accountId}`, error.stack);
      throw error;
    }
  }

  // ─── Admin: list all riders ───────────────────────────────────────────────

  async findAll(filters: { isApproved?: boolean; isAvailable?: boolean } = {}) {
    this.logger.log(`Admin: fetching all riders with filters=${JSON.stringify(filters)}`);
    try {
      const where: any = {};
      if (filters.isApproved !== undefined) where.isApproved = filters.isApproved;
      if (filters.isAvailable !== undefined) where.isAvailable = filters.isAvailable;

      const riders = await this.prisma.rider.findMany({
        where,
        include: {
          account: { include: { profile: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      this.logger.log(`Fetched ${riders.length} riders`);
      return riders;
    } catch (error) {
      this.logger.error('Failed to fetch all riders', error.stack);
      throw error;
    }
  }

  // ─── Admin: find rider by id ──────────────────────────────────────────────

  async findById(id: number) {
    this.logger.log(`Admin: fetching rider id=${id}`);
    try {
      const rider = await this.prisma.rider.findUnique({
        where: { id },
        include: {
          account: { include: { profile: true } },
          deliveries: true,
        },
      });

      if (!rider) {
        throw new NotFoundException(`Rider with id=${id} not found`);
      }

      return rider;
    } catch (error) {
      this.logger.error(`Failed to fetch rider id=${id}`, error.stack);
      throw error;
    }
  }

  // ─── Admin: approve or reject rider ──────────────────────────────────────

  async setApproval(riderId: number, approve: boolean) {
    this.logger.log(`Setting approval=${approve} for riderId=${riderId}`);
    try {
      const rider = await this.prisma.rider.findUnique({
        where: { id: riderId },
      });

      if (!rider) {
        throw new NotFoundException(`Rider with id=${riderId} not found`);
      }

      const updated = await this.prisma.rider.update({
        where: { id: riderId },
        data: { isApproved: approve },
      });

      this.logger.log(`Rider ${riderId} ${approve ? 'approved' : 'rejected'}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to set approval for riderId=${riderId}`, error.stack);
      throw error;
    }
  }
}
