import { Injectable, Logger } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    this.logger.log('Creating a new category');
    try {
      const newCategory = await this.prisma.foodCategory.create({
        data: createCategoryDto,
      });
      this.logger.log('Successfully created a new category');
      return newCategory;
    } catch (error) {
      this.logger.error('Failed to create a new category', error.stack);
      throw error;
    }
  }

  async findAll() {
    this.logger.log('Fetching all categories');
    try {
      const categories = await this.prisma.foodCategory.findMany({
        include: {
          _count: {
            select: {
              FoodMenu: true,
            },
          },
        },
      });
      this.logger.log('Successfully fetched all categories');
      return categories.map((category) => ({
        ...category,
        menuCount: category._count.FoodMenu,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch all categories', error.stack);
      throw error;
    }
  }

  async findOne(id: number) {
    this.logger.log(`Fetching category with ID: ${id}`);
    try {
      const category = await this.prisma.foodCategory.findUniqueOrThrow({
        where: { id },
      });
      this.logger.log(`Successfully fetched category with ID: ${id}`);
      return category;
    } catch (error) {
      this.logger.error(`Failed to fetch category with ID: ${id}`, error.stack);
      throw error;
    }
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    this.logger.log(`Updating category with ID: ${id}`);
    try {
      const updatedCategory = await this.prisma.foodCategory.update({
        where: { id },
        data: { ...updateCategoryDto },
      });
      this.logger.log(`Successfully updated category with ID: ${id}`);
      return updatedCategory;
    } catch (error) {
      this.logger.error(
        `Failed to update category with ID: ${id}`,
        error.stack,
      );
      throw error;
    }
  }

  async remove(id: number) {
    this.logger.log(`Deleting category with ID: ${id}`);
    try {
      await this.prisma.foodMenu.deleteMany({
        where: {
          categoryId: id,
        },
      });

      const deleted = await this.prisma.foodCategory.delete({
        where: {
          id: id,
        },
      });

      if (deleted) {
        this.logger.log(`Successfully deleted category with ID: ${id}`);
        return { message: 'success' };
      } else {
        this.logger.warn(`Unable to delete category with ID: ${id}`);
        return { message: 'unable to delete category' };
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete category with ID: ${id}`,
        error.stack,
      );
      throw error;
    }
  }
  async findTotalCategories() {
    this.logger.log('Getting the total categories');
    return await this.prisma.foodCategory.count();
  }
}
