import {
  Body, Controller, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { DeliveryStatus } from '@prisma/client';
import { DeliveryService } from './delivery.service';
import { AtGuard } from 'src/guards/at.guard';
import { GetUser } from 'src/core/decorators/get-user.decorator';

@ApiTags('Delivery')
@UseGuards(AtGuard)
@ApiBearerAuth('access-token')
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post(':orderId/accept')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Accept a delivery job (Rider)',
    description: `Called by the rider to claim an order. Only one rider can claim a given order — first accept wins.
After accepting, the rider should connect to Socket.io room \`order-{orderId}\` and start emitting \`rider:location\` events every 5 seconds.`,
  })
  @ApiParam({ name: 'orderId', description: 'Order to accept', example: 42 })
  @ApiResponse({
    status: 201,
    description: 'Delivery assigned to rider',
    schema: {
      example: {
        id: 7, orderId: 42, riderId: 3, status: 'ASSIGNED',
        pickupLat: 5.6037, pickupLng: -0.187,
        dropoffLat: 5.6120, dropoffLng: -0.205,
        riderEarning: 4.0,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Order already assigned or rider unavailable' })
  accept(
    @GetUser('riderId') riderId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.deliveryService.acceptDelivery(riderId, orderId);
  }

  @Patch(':orderId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update delivery status (Rider)',
    description: `Move the delivery through its lifecycle. Valid progression:

\`ASSIGNED → HEADING_TO_RESTAURANT → ARRIVED_AT_RESTAURANT → PICKED_UP → HEADING_TO_CUSTOMER → DELIVERED\`

Each status change is broadcast to the customer via Socket.io (\`delivery:status\` event).
On \`DELIVERED\`, the rider is marked available and their earnings are credited.`,
  })
  @ApiParam({ name: 'orderId', description: 'ID of the active delivery order', example: 42 })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: Object.values(DeliveryStatus),
          example: 'PICKED_UP',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Status updated and broadcast to customer' })
  @ApiResponse({ status: 401, description: 'Not the assigned rider for this order' })
  updateStatus(
    @GetUser('riderId') riderId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body('status') status: DeliveryStatus,
  ) {
    return this.deliveryService.updateStatus(riderId, orderId, status);
  }

  @Patch('location')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update rider location (Rider)',
    description: `REST fallback for rider location updates. **Prefer the Socket.io \`rider:location\` event** as it broadcasts to the customer in real-time without the HTTP overhead.
Use this endpoint only when the socket connection is unavailable.`,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['lat', 'lng'],
      properties: {
        lat: { type: 'number', example: 5.6042 },
        lng: { type: 'number', example: -0.1875 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Location updated in database' })
  updateLocation(
    @GetUser('riderId') riderId: number,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.deliveryService.updateRiderLocation(riderId, body.lat, body.lng);
  }
}
