import { Test, TestingModule } from '@nestjs/testing';
import { TrackingGateway } from './tracking.gateway';

const makeSocket = () => ({
  id: 'socket-abc123',
  join: jest.fn(),
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
});

const makeServer = () => ({
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
});

describe('TrackingGateway', () => {
  let gateway: TrackingGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrackingGateway],
    }).compile();

    gateway = module.get<TrackingGateway>(TrackingGateway);
    // Inject a mock server
    (gateway as any).server = makeServer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('logs the connected client id without throwing', () => {
      const client = makeSocket();
      expect(() => gateway.handleConnection(client as any)).not.toThrow();
    });
  });

  describe('handleDisconnect', () => {
    it('logs the disconnected client id without throwing', () => {
      const client = makeSocket();
      expect(() => gateway.handleDisconnect(client as any)).not.toThrow();
    });
  });

  describe('handleCustomerTrack', () => {
    it('joins the order room and returns { joined: "order-42" }', () => {
      const client = makeSocket();
      const result = gateway.handleCustomerTrack(client as any, { orderId: 42 });
      expect(client.join).toHaveBeenCalledWith('order-42');
      expect(result).toEqual({ joined: 'order-42' });
    });
  });

  describe('handleRiderLocation', () => {
    it('broadcasts delivery:location to order room without heading', () => {
      const client = makeSocket();
      gateway.handleRiderLocation(client as any, { orderId: 5, lat: 5.6, lng: -0.2 });
      expect(client.to).toHaveBeenCalledWith('order-5');
      expect(client.emit).toHaveBeenCalledWith(
        'delivery:location',
        expect.objectContaining({ lat: 5.6, lng: -0.2, heading: null }),
      );
    });

    it('broadcasts delivery:location with heading when provided', () => {
      const client = makeSocket();
      gateway.handleRiderLocation(client as any, { orderId: 5, lat: 5.6, lng: -0.2, heading: 180 });
      expect(client.emit).toHaveBeenCalledWith(
        'delivery:location',
        expect.objectContaining({ heading: 180 }),
      );
    });
  });

  describe('handleRiderOnline', () => {
    it('joins rider room and returns { joined: "rider-3" }', () => {
      const client = makeSocket();
      const result = gateway.handleRiderOnline(client as any, { riderId: 3 });
      expect(client.join).toHaveBeenCalledWith('rider-3');
      expect(result).toEqual({ joined: 'rider-3' });
    });
  });

  describe('handleRestaurantJoin', () => {
    it('joins restaurant room and returns { joined: "restaurant-1" }', () => {
      const client = makeSocket();
      const result = gateway.handleRestaurantJoin(client as any, { restaurantId: 1 });
      expect(client.join).toHaveBeenCalledWith('restaurant-1');
      expect(result).toEqual({ joined: 'restaurant-1' });
    });
  });

  describe('notifyOrderRoom', () => {
    it('emits the event with data to the order room', () => {
      const server = (gateway as any).server;
      gateway.notifyOrderRoom(42, 'delivery:assigned', { riderId: 3 });
      expect(server.to).toHaveBeenCalledWith('order-42');
      expect(server.emit).toHaveBeenCalledWith('delivery:assigned', { riderId: 3 });
    });
  });

  describe('notifyRider', () => {
    it('emits the event with data to the rider room', () => {
      const server = (gateway as any).server;
      gateway.notifyRider(7, 'delivery:job_available', { orderId: 1 });
      expect(server.to).toHaveBeenCalledWith('rider-7');
      expect(server.emit).toHaveBeenCalledWith('delivery:job_available', { orderId: 1 });
    });
  });

  describe('notifyRestaurant', () => {
    it('emits order:new with data to the restaurant room', () => {
      const server = (gateway as any).server;
      gateway.notifyRestaurant(1, { orderId: 10, totalAmount: 50 });
      expect(server.to).toHaveBeenCalledWith('restaurant-1');
      expect(server.emit).toHaveBeenCalledWith('order:new', { orderId: 10, totalAmount: 50 });
    });
  });
});
