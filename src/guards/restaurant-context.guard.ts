import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Resolves the restaurant that belongs to the authenticated account and
 * attaches its ID to `req.user.restaurantId`.
 *
 * Must be composed after AtGuard so that `req.user.sub` is already set.
 *
 * Usage:
 *   @UseGuards(AtGuard, RestaurantContextGuard)
 *   @GetUser('restaurantId') restaurantId: number
 *
 * Throws 403 if the account has no linked restaurant (e.g. a platform admin
 * or a customer account trying to hit a restaurant-admin route).
 */
@Injectable()
export class RestaurantContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const accountId: number = request.user?.sub;

    if (!accountId) {
      throw new ForbiddenException('Not authenticated');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { ownerId: accountId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new ForbiddenException(
        'No restaurant is linked to this account. Register a restaurant first.',
      );
    }

    // Attach restaurantId so downstream @GetUser('restaurantId') works
    request.user.restaurantId = restaurant.id;
    return true;
  }
}
