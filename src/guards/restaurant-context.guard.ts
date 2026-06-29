import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Resolves the restaurant for the authenticated account and attaches its ID
 * to `req.user.restaurantId`.  Works for both RESTAURANT_ADMIN (looks up by
 * ownerId) and RESTAURANT_STAFF (reads managedRestaurantId from UserAccount).
 *
 * Must be composed after AtGuard so that `req.user.sub` and `req.user.role`
 * are already set.
 *
 * Usage:
 *   @UseGuards(AtGuard, RestaurantContextGuard)
 *   @GetUser('restaurantId') restaurantId: number
 */
@Injectable()
export class RestaurantContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const accountId: number = request.user?.sub;
    const role: string = request.user?.role;

    if (!accountId) {
      throw new ForbiddenException('Not authenticated');
    }

    if (role === UserRole.RESTAURANT_ADMIN) {
      // Primary lookup: is this admin the owner?
      const owned = await this.prisma.restaurant.findUnique({
        where: { ownerId: accountId },
        select: { id: true },
      });
      if (owned) {
        request.user.restaurantId = owned.id;
        return true;
      }
      // Fallback: co-admin linked via managedRestaurantId
      const account = await this.prisma.userAccount.findUnique({
        where: { id: accountId },
        select: { managedRestaurantId: true },
      });
      if (account?.managedRestaurantId) {
        request.user.restaurantId = account.managedRestaurantId;
        return true;
      }
      throw new ForbiddenException(
        'No restaurant is linked to this account. Register a restaurant first.',
      );
    }

    if (role === UserRole.RESTAURANT_STAFF) {
      const account = await this.prisma.userAccount.findUnique({
        where: { id: accountId },
        select: { managedRestaurantId: true },
      });
      if (!account?.managedRestaurantId) {
        throw new ForbiddenException(
          'No restaurant is assigned to this staff account.',
        );
      }
      request.user.restaurantId = account.managedRestaurantId;
      return true;
    }

    throw new ForbiddenException('This route requires a restaurant-scoped account.');
  }
}
