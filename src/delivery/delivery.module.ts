import { Module } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TrackingModule } from 'src/tracking/tracking.module';

@Module({
  imports: [PrismaModule, TrackingModule],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
