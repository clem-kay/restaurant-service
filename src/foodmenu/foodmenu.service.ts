import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateFoodmenuDto } from './dto/create-foodmenu.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FoodmenuService {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(FoodmenuService.name);

  async create(createFoodmenuDto: CreateFoodmenuDto) {
    this.logger.log('Creating a new food menu item: ' + createFoodmenuDto.name);
    try {
      const { userAccountId, ...rest } = createFoodmenuDto as any;
      const foodMenuItem = await this.prisma.foodMenu.create({
        data: {
          ...rest,
          restaurantId: rest.restaurantId ?? userAccountId ?? 1,
        },
      });
      this.logger.log('Food menu item created: ' + foodMenuItem.name);
      return foodMenuItem;
    } catch (error) {
      this.logger.error('Failed to create food menu item', error.stack);
      throw error;
    }
  }

  async findAll(filters: { isAvailable?: boolean; restaurantId?: number; categoryId?: number } = {}) {
    this.logger.log(`Fetching food menu items filters=${JSON.stringify(filters)}`);
    try {
      const where: any = {};
      if (filters.isAvailable !== undefined) where.isAvailable = filters.isAvailable;
      if (filters.restaurantId)              where.restaurantId = filters.restaurantId;
      if (filters.categoryId)               where.categoryId   = filters.categoryId;

      const foodMenuItems = await this.prisma.foodMenu.findMany({ where });
      this.logger.log(`Successfully fetched ${foodMenuItems.length} food menu items`);
      return foodMenuItems;
    } catch (error) {
      this.logger.error('Failed to fetch food menu items', error.stack);
      throw error;
    }
  }

  async findOne(id: number) {
    this.logger.log(`Fetching menu item with ID: ${id}`);
    try {
      const foodMenuItem = await this.prisma.foodMenu.findUniqueOrThrow({
        where: { id },
        include: {
          restaurant: true,
        },
      });
      this.logger.log(`Successfully fetched menu item with ID: ${id}`);
      return foodMenuItem;
    } catch (error) {
      this.logger.error(
        `Failed to fetch menu item with ID: ${id}`,
        error.stack,
      );
      throw new NotFoundException(
        `Failed to fetch menu item with ID: ${id} not found`,
      );
    }
  }

  async update(id: number, updateFoodmenuDto: CreateFoodmenuDto) {
    this.logger.log(`Updating food menu item with ID: ${id}`);
    try {
      const { userAccountId, ...rest } = updateFoodmenuDto as any;
      const updatedFoodMenuItem = await this.prisma.foodMenu.update({
        where: { id },
        data: { ...rest },
      });
      this.logger.log(`Successfully updated food menu item with ID: ${id}`);
      return updatedFoodMenuItem;
    } catch (error) {
      this.logger.error(
        `Failed to update food menu item with ID: ${id}`,
        error.stack,
      );
      throw error;
    }
  }

  async remove(id: number) {
    this.logger.log(`Deleting food menu item with ID: ${id}`);
    try {
      const deletedFoodMenuItem = await this.prisma.foodMenu.delete({
        where: { id },
      });
      this.logger.log(`Successfully deleted food menu item with ID: ${id}`);
      return deletedFoodMenuItem;
    } catch (error) {
      this.logger.error(
        `Failed to delete food menu item with ID: ${id}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAllByCategory(categoryId: number, isAvailable?: boolean) {
    this.logger.log(`Fetching food menu items by category ID: ${categoryId} isAvailable=${isAvailable}`);
    try {
      const where: any = { categoryId };
      if (isAvailable !== undefined) where.isAvailable = isAvailable;

      const foodMenuItems = await this.prisma.foodMenu.findMany({
        where,
        include: {
          category: true,
        },
      });
      this.logger.log(
        `Successfully fetched food menu items by category ID: ${categoryId}`,
      );
      return foodMenuItems;
    } catch (error) {
      this.logger.error(
        `Failed to fetch food menu items by category ID: ${categoryId}`,
        error.stack,
      );
      throw error;
    }
  }

  async findTotalFoodMenu() {
    this.logger.log('Getting all the foodmenu from the database');
    const totalFoodMenu = await this.prisma.foodMenu.count();
    this.logger.log(
      `Successfully fetched totalfood menu items ${totalFoodMenu}`,
    );
    return totalFoodMenu;
  }
}
