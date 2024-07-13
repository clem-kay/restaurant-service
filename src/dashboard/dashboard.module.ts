import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { CategoryService } from 'src/category/category.service';
import { FoodmenuService } from 'src/foodmenu/foodmenu.service';
import { OrdersService } from 'src/orders/orders.service';
import { OrderGateway } from 'src/orders/order.gateway';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService,CategoryService,FoodmenuService,OrdersService,OrderGateway],
})
export class DashboardModule {}
