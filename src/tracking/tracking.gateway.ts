import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// ─── Room naming conventions ───────────────────────────────────────────────
// order-{orderId}      → customer + rider for one active delivery
// restaurant-{id}      → restaurant admin receives new order events
// rider-{riderId}      → rider receives assignment notifications

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/tracking' })
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(TrackingGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Customer joins order tracking room ──────────────────────────────────
  // Mobile: call this after placing an order
  @SubscribeMessage('customer:track')
  handleCustomerTrack(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { orderId: number },
  ) {
    const room = `order-${payload.orderId}`;
    client.join(room);
    this.logger.log(`Customer joined room ${room}`);
    return { joined: room };
  }

  // ─── Rider broadcasts live location ──────────────────────────────────────
  // Rider app: emit every 5 seconds while on active delivery
  @SubscribeMessage('rider:location')
  handleRiderLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { orderId: number; lat: number; lng: number; heading?: number },
  ) {
    const room = `order-${payload.orderId}`;
    // Broadcast to everyone in the order room EXCEPT the rider
    client.to(room).emit('delivery:location', {
      lat: payload.lat,
      lng: payload.lng,
      heading: payload.heading ?? null,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Rider joins their personal notification room ─────────────────────────
  @SubscribeMessage('rider:online')
  handleRiderOnline(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { riderId: number },
  ) {
    const room = `rider-${payload.riderId}`;
    client.join(room);
    this.logger.log(`Rider ${payload.riderId} online`);
    return { joined: room };
  }

  // ─── Restaurant admin joins their notification room ───────────────────────
  @SubscribeMessage('restaurant:join')
  handleRestaurantJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { restaurantId: number },
  ) {
    const room = `restaurant-${payload.restaurantId}`;
    client.join(room);
    this.logger.log(`Restaurant ${payload.restaurantId} admin connected`);
    return { joined: room };
  }

  // ─── Server-side emitters (called from services) ──────────────────────────

  notifyOrderRoom(orderId: number, event: string, data: any) {
    this.server.to(`order-${orderId}`).emit(event, data);
  }

  notifyRider(riderId: number, event: string, data: any) {
    this.server.to(`rider-${riderId}`).emit(event, data);
  }

  notifyRestaurant(restaurantId: number, data: any) {
    this.server.to(`restaurant-${restaurantId}`).emit('order:new', data);
  }
}
