import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}
  async create(createCategoryDto: CreateCategoryDto) {
    return await this.prisma.foodCategory.create({
      data: createCategoryDto,
    });
  }

  async findAll() {
     const categories = await this.prisma.foodCategory.findMany({
      include :{
        _count:{
          select:{
            FoodMenu:true,
          } 
        }
      }
     });
     return categories.map(
      category =>({
        ...category,
        menuCount:category._count.FoodMenu
      })
     )
  }

  async findOne(id: number) {
    return await this.prisma.foodCategory.findUniqueOrThrow({
      where: { id }
    });
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    return await this.prisma.foodCategory.update({
      where: { id },
      data: { ...updateCategoryDto },
    });
  }

  async remove(id: number) {
    await this.prisma.foodMenu.deleteMany({
      where: {
        categoryId: id,
      },
    });
  
    // Now delete the FoodCategory
    const deleted = await this.prisma.foodCategory.delete({
      where: {
        id: id,
      },
    });
    if (deleted){
      return {message:"success"}
    }else{
      return {message:"unable to deleted category"}
    }
  }
}
