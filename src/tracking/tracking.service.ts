import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrderTracking(orderId: number) {
    this.logger.log(`Getting tracking info for order ${orderId}`);
    const delivery = await this.prisma.delivery.findFirst({
      where: { orderId },
      include: {
        rider: { select: { id: true, firstName: true, lastName: true, phone: true, currentLat: true, currentLng: true, vehicleType: true } },
        order: { select: { id: true, foodStatus: true, totalAmount: true } },
      },
    });
    if (!delivery) throw new NotFoundException(`No delivery found for order ${orderId}`);
    return delivery;
  }

  async updateRiderLocation(riderId: number, dto: UpdateLocationDto) {
    this.logger.log(`Updating location for rider ${riderId}`);
    return this.prisma.rider.update({
      where: { id: riderId },
      data: { currentLat: dto.lat, currentLng: dto.lng } as any,
    });
  }

  async getRiderLocation(riderId: number) {
    this.logger.log(`Getting location for rider ${riderId}`);
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: { id: true, firstName: true, lastName: true, currentLat: true, currentLng: true, isAvailable: true },
    });
    if (!rider) throw new NotFoundException(`Rider ${riderId} not found`);
    return rider;
  }

  async getActiveDeliveries() {
    this.logger.log('Getting all active deliveries');
    return this.prisma.delivery.findMany({
      where: { status: { notIn: ['DELIVERED', 'CANCELLED'] } } as any,
      include: {
        rider: { select: { id: true, firstName: true, lastName: true, currentLat: true, currentLng: true } },
        order: { select: { id: true, foodStatus: true } },
      },
    });
  }
}
