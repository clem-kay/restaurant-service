import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { OnboardingMethod, UserRole } from '@prisma/client';

@Injectable()
export class RestaurantService {
  private readonly logger = new Logger(RestaurantService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Self-service: restaurant owner registers their own restaurant ────────

  async selfRegister(accountId: number, dto: CreateRestaurantDto) {
    const account = await this.prisma.userAccount.findUnique({ where: { id: accountId } });
    if (account.role !== UserRole.RESTAURANT_ADMIN) {
      throw new ForbiddenException('Only restaurant admin accounts can register a restaurant');
    }

    const existing = await this.prisma.restaurant.findUnique({ where: { ownerId: accountId } });
    if (existing) throw new BadRequestException('This account already has a restaurant');

    const restaurant = await this.prisma.restaurant.create({
      data: {
        ...dto,
        ownerId: accountId,
        onboardingMethod: OnboardingMethod.SELF_SERVICE,
        isApproved: false,
      },
    });

    this.logger.log(`Restaurant ${restaurant.id} self-registered — pending approval`);
    return { ...restaurant, message: 'Your restaurant is under review. You will be notified once approved.' };
  }

  // ─── Manual: platform admin creates a restaurant on behalf of an owner ────

  async manualCreate(dto: CreateRestaurantDto & { ownerId: number; isApproved?: boolean }) {
    const { ownerId, isApproved = true, ...rest } = dto;

    const existing = await this.prisma.restaurant.findUnique({ where: { ownerId } });
    if (existing) throw new BadRequestException('Owner already has a restaurant');

    const restaurant = await this.prisma.restaurant.create({
      data: {
        ...rest,
        ownerId,
        onboardingMethod: OnboardingMethod.MANUAL,
        isApproved,
      },
    });

    this.logger.log(`Restaurant ${restaurant.id} manually created by platform admin`);
    return restaurant;
  }

  // ─── Platform admin approves or rejects a self-service registration ───────

  async setApproval(restaurantId: number, approve: boolean) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { isApproved: approve },
    });

    this.logger.log(`Restaurant ${restaurantId} ${approve ? 'approved' : 'rejected'}`);
    return updated;
  }

  // ─── Public listings (customer-facing) ───────────────────────────────────

  async findNearby(lat: number, lng: number, radiusKm = 10) {
    const restaurants: any[] = await this.prisma.$queryRaw`
      SELECT
        r.id, r.name, r.description, r.logo, r."coverImage",
        r.address, r."deliveryFee", r."estimatedMinutes", r."isOpen",
        (6371 * acos(
          cos(radians(${lat})) * cos(radians(r.latitude)) *
          cos(radians(r.longitude) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(r.latitude))
        )) AS "distanceKm"
      FROM "Restaurant" r
      WHERE r."isApproved" = true
      HAVING (6371 * acos(
        cos(radians(${lat})) * cos(radians(r.latitude)) *
        cos(radians(r.longitude) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(r.latitude))
      )) <= ${radiusKm}
      ORDER BY "distanceKm" ASC
    `;
    return restaurants;
  }

  async findMenuByRestaurant(restaurantId: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId, isApproved: true },
      include: {
        categories: {
          include: {
            menu: { where: { isAvailable: true } },
          },
        },
      },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  // ─── Restaurant admin — own restaurant management ─────────────────────────

  async toggleOpen(ownerId: number, isOpen: boolean) {
    return this.prisma.restaurant.update({
      where: { ownerId },
      data: { isOpen },
    });
  }

  async updateOpeningHours(
    ownerId: number,
    hours: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }[],
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { ownerId } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    await this.prisma.openingHours.deleteMany({ where: { restaurantId: restaurant.id } });
    return this.prisma.openingHours.createMany({
      data: hours.map((h) => ({ ...h, restaurantId: restaurant.id })),
    });
  }

  // ─── Admin listing ────────────────────────────────────────────────────────

  findPendingApprovals() {
    return this.prisma.restaurant.findMany({ where: { isApproved: false } });
  }

  findAll(filters: { isApproved?: boolean; isOpen?: boolean } = {}) {
    const where: any = {};
    if (filters.isApproved !== undefined) where.isApproved = filters.isApproved;
    if (filters.isOpen     !== undefined) where.isOpen     = filters.isOpen;

    return this.prisma.restaurant.findMany({
      where,
      include: { owner: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: { openingHours: true, categories: true, owner: { include: { profile: true } } },
    });
    if (!restaurant) throw new NotFoundException(`Restaurant ${id} not found`);
    return restaurant;
  }
}
