import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@ApiTags('Reservation')
@Controller('reservation')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Reservation successfully created.' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  create(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationService.create(createReservationDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'List of reservations retrieved successfully.' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  findAll() {
    return this.reservationService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Reservation retrieved successfully.' })
  @ApiNotFoundResponse({ description: 'Reservation not found.' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  findOne(@Param('id') id: string) {
    return this.reservationService.findOne(+id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Reservation updated successfully.' })
  @ApiNotFoundResponse({ description: 'Reservation not found.' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  update(@Param('id') id: string, @Body() updateReservationDto: UpdateReservationDto) {
    return this.reservationService.update(+id, updateReservationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: 'Reservation deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Reservation not found.' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  remove(@Param('id') id: string) {
    return this.reservationService.remove(+id);
  }
}
