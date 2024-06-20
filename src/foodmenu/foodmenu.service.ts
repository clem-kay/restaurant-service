import { Injectable, Logger } from '@nestjs/common';
import { CreateFoodmenuDto } from './dto/create-foodmenu.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FoodmenuService {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(FoodmenuService.name);

  async create(createFoodmenuDto: CreateFoodmenuDto) {
    this.logger.log('Creating a new food menu item ' + createFoodmenuDto.name);

    const foodMenuItem = await this.prisma.foodMenu.create({
      data: createFoodmenuDto,
    });
    this.logger.log(foodMenuItem.name + 'is created');
    return foodMenuItem;
  }

  async findAll() {
    this.logger.log('Fetching all foodmenu from the database');
    return await this.prisma.foodMenu.findMany();
  }

  async findOne(id: number) {
    this.logger.log(`Fetching menu item with id ${id}`);
    return await this.prisma.foodMenu.findUniqueOrThrow({
      where: { id },
      include: {
        userAccount: true,
      },
    });
  }

  async update(id: number, updateFoodmenuDto: CreateFoodmenuDto) {
    this.logger.log(`Updating food item ${id}`);
    return await this.prisma.foodMenu.update({
      where: { id },
      data: { ...updateFoodmenuDto },
    });
  }

  async remove(id: number) {
    this.logger.log(`Deleting food item ${id}`);
    return await this.prisma.foodMenu.delete({
      where: { id },
    });
  }

  async findAllByCategory(categoryId: number) {
    return await this.prisma.foodMenu.findMany({
      where: { categoryId },
      include:{
        category:true
      }
    });
  }
}
