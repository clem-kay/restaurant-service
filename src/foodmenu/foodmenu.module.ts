import { Module } from '@nestjs/common';
import { FoodmenuService } from './foodmenu.service';
import { FoodmenuController } from './foodmenu.controller';

@Module({
  controllers: [FoodmenuController],
  providers: [FoodmenuService],
})
export class FoodmenuModule {}
