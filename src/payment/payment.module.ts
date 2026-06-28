import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DeliveryModule } from 'src/delivery/delivery.module';
import { TrackingModule } from 'src/tracking/tracking.module';

@Module({
  imports: [PrismaModule, DeliveryModule, TrackingModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
