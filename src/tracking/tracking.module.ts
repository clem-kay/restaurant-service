import { Module } from '@nestjs/common';
import { TrackingGateway } from './tracking.gateway';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TrackingController],
  providers: [TrackingGateway, TrackingService],
  exports: [TrackingGateway, TrackingService],
})
export class TrackingModule {}
