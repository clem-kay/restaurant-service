import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderGateway } from './order.gateway';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrderGateway],
})
export class OrdersModule {}
