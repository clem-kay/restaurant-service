import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TrackingGateway } from 'src/tracking/tracking.gateway';
import { DeliveryStatus, FoodStatus } from '@prisma/client';

const RIDER_EARNING_RATE = 0.80;
const INITIAL_SEARCH_RADIUS_KM = 5;
const EXPANDED_SEARCH_RADIUS_KM = 10;
const ASSIGNMENT_TIMEOUT_MS = 120_000;

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);
  private assignmentTimers = new Map<number, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly trackingGateway: TrackingGateway,
  ) {}

  // ─── Triggered when restaurant marks food as READY ───────────────────────

  async initiateRiderSearch(orderId: number) {
    this.logger.log(`Initiating rider search for order ${orderId}`);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true, deliveryAddress: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    await this.notifyNearbyRiders(order, INITIAL_SEARCH_RADIUS_KM);

    const timer = setTimeout(async () => {
      const stillUnassigned = await this.prisma.delivery.findUnique({ where: { orderId } });
      if (!stillUnassigned) {
        this.logger.warn(`No rider accepted order ${orderId} — expanding to ${EXPANDED_SEARCH_RADIUS_KM}km`);
        await this.notifyNearbyRiders(order, EXPANDED_SEARCH_RADIUS_KM);
      }
      this.assignmentTimers.delete(orderId);
    }, ASSIGNMENT_TIMEOUT_MS);

    this.assignmentTimers.set(orderId, timer);
  }

  private async notifyNearbyRiders(order: any, radiusKm: number) {
    const riders = await this.findAvailableRidersInRadius(
      order.restaurant.latitude,
      order.restaurant.longitude,
      radiusKm,
    );

    if (riders.length === 0) {
      this.logger.warn(`No riders within ${radiusKm}km for order ${order.id}`);
      return;
    }

    this.logger.log(`Notifying ${riders.length} riders for order ${order.id}`);

    for (const rider of riders.slice(0, 5)) {
      this.trackingGateway.notifyRider(rider.id, 'delivery:job_available', {
        orderId: order.id,
        restaurantName: order.restaurant.name,
        restaurantAddress: order.restaurant.address,
        dropoffAddress: order.deliveryAddress.address,
        deliveryFee: order.deliveryFee,
        riderEarning: parseFloat((order.deliveryFee * RIDER_EARNING_RATE).toFixed(2)),
        distanceKm: rider.distanceKm,
      });
    }
  }

  // ─── Rider accepts a delivery job ────────────────────────────────────────

  async acceptDelivery(riderId: number, orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true, deliveryAddress: true, delivery: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.delivery) throw new BadRequestException('Order already assigned to another rider');
    if (order.foodStatus === FoodStatus.CANCELLED) throw new BadRequestException('Order was cancelled');

    const rider = await this.prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider || !rider.isAvailable) throw new BadRequestException('Rider is not available');

    const riderEarning = parseFloat((order.deliveryFee * RIDER_EARNING_RATE).toFixed(2));

    const [delivery] = await this.prisma.$transaction([
      this.prisma.delivery.create({
        data: {
          orderId,
          riderId,
          status: DeliveryStatus.ASSIGNED,
          pickupLat: order.restaurant.latitude,
          pickupLng: order.restaurant.longitude,
          dropoffLat: order.deliveryAddress.latitude,
          dropoffLng: order.deliveryAddress.longitude,
          riderEarning,
        },
      }),
      this.prisma.rider.update({
        where: { id: riderId },
        data: { isAvailable: false },
      }),
    ]);

    const timer = this.assignmentTimers.get(orderId);
    if (timer) {
      clearTimeout(timer);
      this.assignmentTimers.delete(orderId);
    }

    this.trackingGateway.notifyOrderRoom(orderId, 'delivery:assigned', {
      riderId,
      riderName: `${rider.firstName} ${rider.lastName}`,
      vehicleType: rider.vehicleType,
    });

    this.logger.log(`Rider ${riderId} assigned to order ${orderId}`);
    return delivery;
  }

  // ─── Rider updates delivery status ───────────────────────────────────────

  async updateStatus(riderId: number, orderId: number, status: DeliveryStatus) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { orderId },
      include: { order: true },
    });

    if (!delivery || delivery.riderId !== riderId) {
      throw new UnauthorizedException('Not your delivery');
    }

    const updates: any = { status };

    if (status === DeliveryStatus.PICKED_UP) {
      updates.pickedUpAt = new Date();
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          foodStatus: FoodStatus.PICKED_UP,
          statusHistory: { create: { status: FoodStatus.PICKED_UP } },
        },
      });
    }

    if (status === DeliveryStatus.DELIVERED) {
      updates.deliveredAt = new Date();
      await this.prisma.$transaction([
        this.prisma.order.update({
          where: { id: orderId },
          data: {
            foodStatus: FoodStatus.DELIVERED,
            statusHistory: { create: { status: FoodStatus.DELIVERED } },
          },
        }),
        this.prisma.rider.update({
          where: { id: riderId },
          data: {
            isAvailable: true,
            totalEarnings: { increment: delivery.riderEarning },
          },
        }),
      ]);
    }

    const updated = await this.prisma.delivery.update({ where: { orderId }, data: updates });

    this.trackingGateway.notifyOrderRoom(orderId, 'delivery:status', {
      status,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  // ─── Rider location update (REST fallback — prefer socket) ───────────────

  async updateRiderLocation(riderId: number, lat: number, lng: number) {
    return this.prisma.rider.update({
      where: { id: riderId },
      data: { currentLat: lat, currentLng: lng },
    });
  }

  // ─── Haversine query — find riders within radius ──────────────────────────

  private async findAvailableRidersInRadius(lat: number, lng: number, radiusKm: number) {
    const riders: Array<{ id: number; distanceKm: number }> = await this.prisma.$queryRaw`
      SELECT
        r.id,
        (6371 * acos(
          cos(radians(${lat})) * cos(radians(r."currentLat")) *
          cos(radians(r."currentLng") - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(r."currentLat"))
        )) AS "distanceKm"
      FROM "Rider" r
      WHERE r."isAvailable" = true
        AND r."isApproved" = true
        AND r."currentLat" IS NOT NULL
        AND r."currentLng" IS NOT NULL
      HAVING (6371 * acos(
        cos(radians(${lat})) * cos(radians(r."currentLat")) *
        cos(radians(r."currentLng") - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(r."currentLat"))
      )) <= ${radiusKm}
      ORDER BY "distanceKm" ASC
      LIMIT 10
    `;

    return riders;
  }
}
