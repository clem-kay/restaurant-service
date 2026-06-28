import { Module } from '@nestjs/common';
import { FoodmenuService } from './foodmenu.service';
import { FoodmenuController } from './foodmenu.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FoodmenuController],
  providers: [FoodmenuService],
  exports: [FoodmenuService],
})
export class FoodmenuModule {}
