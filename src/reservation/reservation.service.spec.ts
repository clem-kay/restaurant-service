import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

const mockReservation = {
  id: 1,
  date: new Date('2025-12-25'),
  time: '19:00',
  numberOfGuests: 4,
  name: 'John Doe',
  phone: '+233244000000',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrismaService = {
  reservation: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('ReservationService', () => {
  let service: ReservationService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const createDto: CreateReservationDto = {
      date: '2025-12-25',
      time: '19:00',
      numberOfGuests: 4,
      name: 'John Doe',
      phone: '+233244000000',
    };

    it('should create and return a reservation, converting date string to Date', async () => {
      prisma.reservation.create.mockResolvedValue(mockReservation);

      const result = await service.create(createDto);

      expect(prisma.reservation.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          date: new Date(createDto.date),
        },
      });
      expect(result).toEqual(mockReservation);
    });

    it('should throw and log an error when prisma.reservation.create fails', async () => {
      const error = new Error('DB create error');
      prisma.reservation.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow('DB create error');
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to create a new reservation',
        error.stack,
      );
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all reservations', async () => {
      const reservations = [mockReservation];
      prisma.reservation.findMany.mockResolvedValue(reservations);

      const result = await service.findAll();

      expect(prisma.reservation.findMany).toHaveBeenCalledWith({});
      expect(result).toEqual(reservations);
    });

    it('should throw and log an error when prisma.reservation.findMany fails', async () => {
      const error = new Error('DB findMany error');
      prisma.reservation.findMany.mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow('DB findMany error');
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to fetch all reservations',
        error.stack,
      );
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return the reservation matching the given id', async () => {
      prisma.reservation.findUnique.mockResolvedValue(mockReservation);

      const result = await service.findOne(1);

      expect(prisma.reservation.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockReservation);
    });

    it('should throw and log an error when prisma.reservation.findUnique fails', async () => {
      const error = new Error('DB findUnique error');
      prisma.reservation.findUnique.mockRejectedValue(error);

      await expect(service.findOne(1)).rejects.toThrow('DB findUnique error');
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to fetch reservation with ID: 1',
        error.stack,
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    const updateDto: UpdateReservationDto = {
      numberOfGuests: 6,
      name: 'Jane Doe',
    };

    const updatedReservation = { ...mockReservation, numberOfGuests: 6, name: 'Jane Doe' };

    it('should update and return the reservation with the given id', async () => {
      prisma.reservation.update.mockResolvedValue(updatedReservation);

      const result = await service.update(1, updateDto);

      expect(prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ...updateDto },
      });
      expect(result).toEqual(updatedReservation);
    });

    it('should throw and log an error when prisma.reservation.update fails', async () => {
      const error = new Error('DB update error');
      prisma.reservation.update.mockRejectedValue(error);

      await expect(service.update(1, updateDto)).rejects.toThrow('DB update error');
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to update reservation with ID: 1',
        error.stack,
      );
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete and return the reservation with the given id', async () => {
      prisma.reservation.delete.mockResolvedValue(mockReservation);

      const result = await service.remove(1);

      expect(prisma.reservation.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockReservation);
    });

    it('should throw and log an error when prisma.reservation.delete fails', async () => {
      const error = new Error('DB delete error');
      prisma.reservation.delete.mockRejectedValue(error);

      await expect(service.remove(1)).rejects.toThrow('DB delete error');
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to delete reservation with ID: 1',
        error.stack,
      );
    });
  });
});
