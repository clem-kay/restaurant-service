import { Injectable, Logger } from '@nestjs/common';
import { CreateFoodmenuDto } from './dto/create-foodmenu.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FoodmenuService {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(FoodmenuService.name);

  async create(createFoodmenuDto: CreateFoodmenuDto) {
    this.logger.log('Creating a new food menu item: ' + createFoodmenuDto.name);
    try {
      const foodMenuItem = await this.prisma.foodMenu.create({
        data: createFoodmenuDto,
      });
      this.logger.log('Food menu item created: ' + foodMenuItem.name);
      return foodMenuItem;
    } catch (error) {
      this.logger.error('Failed to create food menu item', error.stack);
      throw error;
    }
  }

  async findAll() {
    this.logger.log('Fetching all food menu items from the database');
    try {
      const foodMenuItems = await this.prisma.foodMenu.findMany();
      this.logger.log('Successfully fetched all food menu items');
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
          userAccount: true,
        },
      });
      this.logger.log(`Successfully fetched menu item with ID: ${id}`);
      return foodMenuItem;
    } catch (error) {
      this.logger.error(`Failed to fetch menu item with ID: ${id}`, error.stack);
      throw error;
    }
  }

  async update(id: number, updateFoodmenuDto: CreateFoodmenuDto) {
    this.logger.log(`Updating food menu item with ID: ${id}`);
    try {
      const updatedFoodMenuItem = await this.prisma.foodMenu.update({
        where: { id },
        data: { ...updateFoodmenuDto },
      });
      this.logger.log(`Successfully updated food menu item with ID: ${id}`);
      return updatedFoodMenuItem;
    } catch (error) {
      this.logger.error(`Failed to update food menu item with ID: ${id}`, error.stack);
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
      this.logger.error(`Failed to delete food menu item with ID: ${id}`, error.stack);
      throw error;
    }
  }

  async findAllByCategory(categoryId: number) {
    this.logger.log(`Fetching food menu items by category ID: ${categoryId}`);
    try {
      const foodMenuItems = await this.prisma.foodMenu.findMany({
        where: { categoryId },
        include: {
          category: true,
        },
      });
      this.logger.log(`Successfully fetched food menu items by category ID: ${categoryId}`);
      return foodMenuItems;
    } catch (error) {
      this.logger.error(`Failed to fetch food menu items by category ID: ${categoryId}`, error.stack);
      throw error;
    }
  }
}
