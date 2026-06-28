import {
  Controller, Get, Post, Body, Param, Delete, Put, HttpCode, HttpStatus, Logger,
} from '@nestjs/common';
import {
  ApiBody, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse,
  ApiOperation, ApiParam, ApiTags,
} from '@nestjs/swagger';
import { ReservationService } from './reservation.service';
import { CreateReservationDto, UpdateReservationDto } from './dto/create-reservation.dto';

@ApiTags('Reservation')
@Controller('reservation')
export class ReservationController {
  private readonly logger = new Logger(ReservationController.name);
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a table reservation', description: 'Books a table. No auth required — customers call this from the public-facing app.' })
  @ApiBody({ type: CreateReservationDto })
  @ApiCreatedResponse({
    description: 'Reservation created',
    schema: {
      example: { id: 1, name: 'John Doe', date: '2025-12-25', time: '19:00', numberOfGuests: 4, phone: '+233244000000' },
    },
  })
  create(@Body() dto: CreateReservationDto) {
    this.logger.log(`New reservation from ${dto.name}`);
    return this.reservationService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all reservations (Admin)' })
  @ApiOkResponse({ description: 'All reservations' })
  findAll() {
    return this.reservationService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a reservation by ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ description: 'Reservation found' })
  @ApiNotFoundResponse({ description: 'Reservation not found' })
  findOne(@Param('id') id: string) {
    return this.reservationService.findOne(+id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a reservation' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: UpdateReservationDto })
  @ApiOkResponse({ description: 'Reservation updated' })
  @ApiNotFoundResponse({ description: 'Reservation not found' })
  update(@Param('id') id: string, @Body() dto: UpdateReservationDto) {
    return this.reservationService.update(+id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a reservation' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ description: 'Reservation deleted' })
  @ApiNotFoundResponse({ description: 'Reservation not found' })
  remove(@Param('id') id: string) {
    return this.reservationService.remove(+id);
  }
}
