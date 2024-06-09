import { Injectable } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReservationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createReservationDto: CreateReservationDto) {
    return await this.prisma.reservation.create({
      data: {
        ...createReservationDto,
        date: new Date(createReservationDto.date),
      },
    });
  }

  async findAll() {
    return await this.prisma.reservation.findMany({});
  }

  async findOne(id: number) {
    return await this.prisma.reservation.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateReservationDto: UpdateReservationDto) {
    return await this.prisma.reservation.update({
      where: { id },
      data: { ...updateReservationDto },
    });
  }

  async remove(id: number) {
    return await this.prisma.reservation.delete({
      where: { id },
    });
  }
}
