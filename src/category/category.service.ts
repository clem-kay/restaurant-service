import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Restaurant Admin ─────────────────────────────────────────────────────

  async create(restaurantId: number, dto: CreateCategoryDto) {
    this.logger.log(`Creating category for restaurantId=${restaurantId}`);
    return this.prisma.foodCategory.create({
      data: { ...dto, restaurantId },
    });
  }

  async update(restaurantId: number, id: number, dto: UpdateCategoryDto) {
    this.logger.log(`Updating category id=${id} for restaurantId=${restaurantId}`);
    await this.assertOwnership(restaurantId, id);
    return this.prisma.foodCategory.update({ where: { id }, data: dto });
  }

  async remove(restaurantId: number, id: number) {
    this.logger.log(`Deleting category id=${id} for restaurantId=${restaurantId}`);
    await this.assertOwnership(restaurantId, id);

    await this.prisma.foodMenu.deleteMany({ where: { categoryId: id } });
    await this.prisma.foodCategory.delete({ where: { id } });
    return { message: 'Category deleted' };
  }

  async findMine(restaurantId: number) {
    this.logger.log(`Fetching categories for restaurantId=${restaurantId}`);
    const categories = await this.prisma.foodCategory.findMany({
      where: { restaurantId },
      include: { _count: { select: { menu: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return categories.map((c) => ({ ...c, menuCount: c._count.menu }));
  }

  // ─── Public / Platform Admin ──────────────────────────────────────────────

  async findAll(restaurantId?: number) {
    this.logger.log(`Fetching categories restaurantId=${restaurantId ?? 'all'}`);
    const where: any = {};
    if (restaurantId) where.restaurantId = restaurantId;

    const categories = await this.prisma.foodCategory.findMany({
      where,
      include: { _count: { select: { menu: true } } },
    });
    return categories.map((c) => ({ ...c, menuCount: c._count.menu }));
  }

  async findOne(id: number) {
    this.logger.log(`Fetching category id=${id}`);
    const category = await this.prisma.foodCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }

  async findTotalCategories() {
    return this.prisma.foodCategory.count();
  }

  // ─── Ownership helper ─────────────────────────────────────────────────────

  private async assertOwnership(restaurantId: number, categoryId: number) {
    const category = await this.prisma.foodCategory.findUnique({
      where: { id: categoryId },
      select: { restaurantId: true },
    });
    if (!category) throw new NotFoundException(`Category ${categoryId} not found`);
    if (category.restaurantId !== restaurantId) {
      throw new ForbiddenException('This category does not belong to your restaurant');
    }
  }
}
