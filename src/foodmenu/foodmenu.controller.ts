import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { FoodmenuService } from './foodmenu.service';
import { CreateFoodmenuDto } from './dto/create-foodmenu.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('foodmenu')
export class FoodmenuController {
  constructor(private readonly foodmenuService: FoodmenuService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() createFoodmenuDto: CreateFoodmenuDto) {
    return this.foodmenuService.create(createFoodmenuDto);
  }

  @Get()
  findAll() {
    return this.foodmenuService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.foodmenuService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string,@Body() updateFoodmenuDto: CreateFoodmenuDto,
  ) {
    return this.foodmenuService.update(+id, updateFoodmenuDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string) {
    return this.foodmenuService.remove(+id);
  }
}
