import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, type: string, title: string, body: string, data?: object) {
    return this.prisma.notification.create({
      data: { userId, type, title, body, data },
    });
  }

  async findForUser(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(id: number, userId: number) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async unreadCount(userId: number) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async notifyNewOrder(restaurantStaffIds: number[], orderId: number, restaurantName: string) {
    this.logger.log(`Notifying ${restaurantStaffIds.length} staff of new order ${orderId}`);
    await Promise.all(
      restaurantStaffIds.map((uid) =>
        this.create(uid, 'NEW_ORDER', 'New Order Received', `Order #${orderId} arrived at ${restaurantName}`, { orderId }),
      ),
    );
  }
}
