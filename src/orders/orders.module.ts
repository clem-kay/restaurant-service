import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { TrackingModule } from 'src/tracking/tracking.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [CacheModule.register(), TrackingModule, NotificationModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
