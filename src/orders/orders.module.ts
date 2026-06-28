import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports:[CacheModule.register(),],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
