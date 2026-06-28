import { Controller, Get, Patch, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { UpdateLocationDto } from './dto/update-location.dto';

@ApiTags('tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('order/:orderId') getOrderTracking(@Param('orderId', ParseIntPipe) orderId: number) { return this.trackingService.getOrderTracking(orderId); }
  @Patch('rider/:riderId/location') updateRiderLocation(@Param('riderId', ParseIntPipe) riderId: number, @Body() dto: UpdateLocationDto) { return this.trackingService.updateRiderLocation(riderId, dto); }
  @Get('rider/:riderId/location') getRiderLocation(@Param('riderId', ParseIntPipe) riderId: number) { return this.trackingService.getRiderLocation(riderId); }
  @Get('active') getActiveDeliveries() { return this.trackingService.getActiveDeliveries(); }
}
