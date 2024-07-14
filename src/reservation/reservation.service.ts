import { Injectable, Logger } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createReservationDto: CreateReservationDto) {
    this.logger.log('Creating a new reservation');
    try {
      const reservation = await this.prisma.reservation.create({
        data: {
          ...createReservationDto,
          date: new Date(createReservationDto.date),
        },
      });
      this.logger.log('Successfully created a new reservation');
      return reservation;
    } catch (error) {
      this.logger.error('Failed to create a new reservation', error.stack);
      throw error;
    }
  }

  async findAll() {
    this.logger.log('Fetching all reservations');
    try {
      const reservations = await this.prisma.reservation.findMany({});
      this.logger.log('Successfully fetched all reservations');
      return reservations;
    } catch (error) {
      this.logger.error('Failed to fetch all reservations', error.stack);
      throw error;
    }
  }

  async findOne(id: number) {
    this.logger.log(`Fetching reservation with ID: ${id}`);
    try {
      const reservation = await this.prisma.reservation.findUnique({
        where: { id },
      });
      this.logger.log(`Successfully fetched reservation with ID: ${id}`);
      return reservation;
    } catch (error) {
      this.logger.error(
        `Failed to fetch reservation with ID: ${id}`,
        error.stack,
      );
      throw error;
    }
  }

  async update(id: number, updateReservationDto: UpdateReservationDto) {
    this.logger.log(`Updating reservation with ID: ${id}`);
    try {
      const reservation = await this.prisma.reservation.update({
        where: { id },
        data: { ...updateReservationDto },
      });
      this.logger.log(`Successfully updated reservation with ID: ${id}`);
      return reservation;
    } catch (error) {
      this.logger.error(
        `Failed to update reservation with ID: ${id}`,
        error.stack,
      );
      throw error;
    }
  }

  async remove(id: number) {
    this.logger.log(`Deleting reservation with ID: ${id}`);
    try {
      const reservation = await this.prisma.reservation.delete({
        where: { id },
      });
      this.logger.log(`Successfully deleted reservation with ID: ${id}`);
      return reservation;
    } catch (error) {
      this.logger.error(
        `Failed to delete reservation with ID: ${id}`,
        error.stack,
      );
      throw error;
    }
  }
}
