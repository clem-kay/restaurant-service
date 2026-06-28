import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateFoodmenuDto, UpdateFoodmenuDto } from './dto/create-foodmenu.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FoodmenuService {
  private readonly logger = new Logger(FoodmenuService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Restaurant Admin ─────────────────────────────────────────────────────

  async create(restaurantId: number, dto: CreateFoodmenuDto) {
    this.logger.log(`Creating menu item "${dto.name}" for restaurantId=${restaurantId}`);
    return this.prisma.foodMenu.create({
      data: { ...dto, restaurantId } as Prisma.FoodMenuUncheckedCreateInput,
    });
  }

  async update(restaurantId: number, id: number, dto: UpdateFoodmenuDto) {
    this.logger.log(`Updating menu item id=${id} for restaurantId=${restaurantId}`);
    await this.assertOwnership(restaurantId, id);
    return this.prisma.foodMenu.update({ where: { id }, data: dto });
  }

  async remove(restaurantId: number, id: number) {
    this.logger.log(`Deleting menu item id=${id} for restaurantId=${restaurantId}`);
    await this.assertOwnership(restaurantId, id);
    await this.prisma.foodMenu.delete({ where: { id } });
    return { message: 'Menu item deleted' };
  }

  async findMine(restaurantId: number) {
    this.logger.log(`Fetching menu items for restaurantId=${restaurantId}`);
    return this.prisma.foodMenu.findMany({
      where: { restaurantId },
      include: { category: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Public / Platform Admin ──────────────────────────────────────────────

  async findAll(filters: { isAvailable?: boolean; restaurantId?: number; categoryId?: number } = {}) {
    this.logger.log(`Fetching menu items filters=${JSON.stringify(filters)}`);
    const where: any = {};
    if (filters.isAvailable !== undefined) where.isAvailable = filters.isAvailable;
    if (filters.restaurantId)             where.restaurantId = filters.restaurantId;
    if (filters.categoryId)              where.categoryId   = filters.categoryId;
    return this.prisma.foodMenu.findMany({ where });
  }

  async findOne(id: number) {
    this.logger.log(`Fetching menu item id=${id}`);
    const item = await this.prisma.foodMenu.findUnique({
      where: { id },
      include: { restaurant: true },
    });
    if (!item) throw new NotFoundException(`Menu item ${id} not found`);
    return item;
  }

  async findAllByCategory(categoryId: number, isAvailable?: boolean) {
    this.logger.log(`Fetching menu items categoryId=${categoryId} isAvailable=${isAvailable}`);
    const where: any = { categoryId };
    if (isAvailable !== undefined) where.isAvailable = isAvailable;
    return this.prisma.foodMenu.findMany({ where, include: { category: true } });
  }

  async findTotalFoodMenu() {
    return this.prisma.foodMenu.count();
  }

  // ─── Ownership helper ─────────────────────────────────────────────────────

  private async assertOwnership(restaurantId: number, menuItemId: number) {
    const item = await this.prisma.foodMenu.findUnique({
      where: { id: menuItemId },
      select: { restaurantId: true },
    });
    if (!item) throw new NotFoundException(`Menu item ${menuItemId} not found`);
    if (item.restaurantId !== restaurantId) {
      throw new ForbiddenException('This menu item does not belong to your restaurant');
    }
  }
}
