import { Module } from '@nestjs/common';
import { RiderController } from './rider.controller';
import { RiderService } from './rider.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [],
  controllers: [RiderController],
  providers: [RiderService, PrismaService],
  exports: [RiderService],
})
export class RiderModule {}
