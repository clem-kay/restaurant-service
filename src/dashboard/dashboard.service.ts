import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPlatformStats(restaurantId?: number) {
    this.logger.log(`Getting platform stats${restaurantId ? ` for restaurant ${restaurantId}` : ''}`);

    if (restaurantId) {
      // Scoped view: PLATFORM_ADMIN drilled into a specific restaurant
      return this.getRestaurantScopedStats(restaurantId);
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const [
      totalRestaurants,
      pendingApprovals,
      totalUsers,
      totalCustomers,
      totalRiders,
      totalOrders,
      todayOrders,
      allRevenue,
      todayRevenue,
      totalFoodItems,
      totalCategories,
    ] = await Promise.all([
      this.prisma.restaurant.count(),
      this.prisma.restaurant.count({ where: { isApproved: false } }),
      this.prisma.userAccount.count({ where: { role: { in: [UserRole.RESTAURANT_ADMIN, UserRole.RESTAURANT_STAFF] } } }),
      this.prisma.customer.count(),
      this.prisma.rider.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: todayStart, lt: todayEnd } } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { createdAt: { gte: todayStart, lt: todayEnd } } }),
      this.prisma.foodMenu.count(),
      this.prisma.foodCategory.count(),
    ]);

    return {
      totalRestaurants,
      pendingApprovals,
      totalUsers,
      totalCustomers,
      totalRiders,
      totalOrders,
      todayOrders,
      totalRevenue: allRevenue._sum.totalAmount ?? 0,
      todaySales: todayRevenue._sum.totalAmount ?? 0,
      totalFoodItems,
      totalCategories,
    };
  }

  async getRestaurantStats(userId: number, role: UserRole) {
    this.logger.log(`Getting restaurant stats for user ${userId} (${role})`);

    // Resolve the restaurantId for this user
    let restaurantId: number | null = null;

    if (role === UserRole.RESTAURANT_ADMIN) {
      const owned = await this.prisma.restaurant.findUnique({
        where: { ownerId: userId },
        select: { id: true },
      });
      if (owned) {
        restaurantId = owned.id;
      } else {
        const account = await this.prisma.userAccount.findUnique({
          where: { id: userId },
          select: { managedRestaurantId: true },
        });
        restaurantId = account?.managedRestaurantId ?? null;
      }
    } else if (role === UserRole.RESTAURANT_STAFF) {
      const account = await this.prisma.userAccount.findUnique({
        where: { id: userId },
        select: { managedRestaurantId: true },
      });
      restaurantId = account?.managedRestaurantId ?? null;
    }

    if (!restaurantId) {
      return { totalOrders: 0, todayOrders: 0, totalRevenue: 0, todaySales: 0, totalFoodItems: 0, totalCategories: 0 };
    }

    return this.getRestaurantScopedStats(restaurantId);
  }

  private async getRestaurantScopedStats(restaurantId: number) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalOrders,
      todayOrders,
      allRevenue,
      todayRevenue,
      prevMonthOrders,
      prevMonthRevenue,
      totalFoodItems,
      totalCategories,
      totalStaff,
    ] = await Promise.all([
      this.prisma.order.count({ where: { restaurantId } }),
      this.prisma.order.count({ where: { restaurantId, createdAt: { gte: todayStart, lt: todayEnd } } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { restaurantId } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { restaurantId, createdAt: { gte: todayStart, lt: todayEnd } } }),
      this.prisma.order.count({ where: { restaurantId, createdAt: { gte: prevMonthStart, lte: prevMonthEnd } } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { restaurantId, createdAt: { gte: prevMonthStart, lte: prevMonthEnd } } }),
      this.prisma.foodMenu.count({ where: { restaurantId } }),
      this.prisma.foodCategory.count({ where: { restaurantId } }),
      this.prisma.userAccount.count({ where: { managedRestaurantId: restaurantId } }),
    ]);

    return {
      totalOrders,
      todayOrders,
      totalRevenue: allRevenue._sum.totalAmount ?? 0,
      todaySales: todayRevenue._sum.totalAmount ?? 0,
      prevMonthOrders,
      prevMonthRevenue: prevMonthRevenue._sum.totalAmount ?? 0,
      totalFoodItems,
      totalCategories,
      totalStaff,
    };
  }
}
