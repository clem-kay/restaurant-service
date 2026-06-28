import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { RiderService } from './rider.service';
import { CreateRiderDto, UpdateRiderDto } from './dto/create-rider.dto';
import { AtGuard } from 'src/guards/at.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/guards/roles.decorator';
import { GetUser } from 'src/core/decorators/get-user.decorator';

@ApiTags('Rider')
@Controller('rider')
export class RiderController {
  constructor(private readonly riderService: RiderService) {}

  // ─── Register rider profile ───────────────────────────────────────────────

  @Post('register')
  @UseGuards(AtGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Register rider profile',
    description: 'Creates a rider profile linked to the authenticated user account. Starts as unapproved and unavailable.',
  })
  @ApiBody({ type: CreateRiderDto })
  @ApiResponse({ status: 201, description: 'Rider profile created successfully' })
  @ApiResponse({ status: 400, description: 'Rider profile already exists' })
  register(@GetUser('sub') accountId: number, @Body() dto: CreateRiderDto) {
    return this.riderService.register(accountId, dto);
  }

  // ─── Get own profile ──────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get own rider profile' })
  @ApiResponse({ status: 200, description: 'Rider profile returned' })
  @ApiResponse({ status: 404, description: 'Rider profile not found' })
  getProfile(@GetUser('sub') accountId: number) {
    return this.riderService.getProfile(accountId);
  }

  // ─── Update own profile ───────────────────────────────────────────────────

  @Patch('me')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update own rider profile' })
  @ApiBody({ type: UpdateRiderDto })
  @ApiResponse({ status: 200, description: 'Rider profile updated' })
  updateProfile(@GetUser('sub') accountId: number, @Body() dto: UpdateRiderDto) {
    return this.riderService.updateProfile(accountId, dto);
  }

  // ─── Toggle availability ──────────────────────────────────────────────────

  @Patch('availability')
  @UseGuards(AtGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Toggle rider availability' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['isAvailable'],
      properties: { isAvailable: { type: 'boolean', example: true } },
    },
  })
  @ApiResponse({ status: 200, description: 'Availability status updated' })
  toggleAvailability(
    @GetUser('sub') accountId: number,
    @Body('isAvailable', ParseBoolPipe) isAvailable: boolean,
  ) {
    return this.riderService.toggleAvailability(accountId, isAvailable);
  }

  // ─── Get deliveries ───────────────────────────────────────────────────────

  @Get('deliveries')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Get rider's deliveries" })
  @ApiResponse({ status: 200, description: 'List of deliveries' })
  getDeliveries(@GetUser('sub') accountId: number) {
    return this.riderService.getDeliveries(accountId);
  }

  // ─── Get earnings ─────────────────────────────────────────────────────────

  @Get('earnings')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get rider earnings summary' })
  @ApiResponse({
    status: 200,
    description: 'Earnings summary',
    schema: { example: { totalEarnings: 450.5, totalDeliveries: 38 } },
  })
  getEarnings(@GetUser('sub') accountId: number) {
    return this.riderService.getEarnings(accountId);
  }

  // ─── Admin: list all riders ───────────────────────────────────────────────

  @Get()
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all riders (Platform Admin)' })
  @ApiQuery({ name: 'isApproved', required: false, type: Boolean })
  @ApiQuery({ name: 'isAvailable', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of riders' })
  findAll(
    @Query('isApproved') isApproved?: string,
    @Query('isAvailable') isAvailable?: string,
  ) {
    return this.riderService.findAll({
      isApproved: isApproved !== undefined ? isApproved === 'true' : undefined,
      isAvailable: isAvailable !== undefined ? isAvailable === 'true' : undefined,
    });
  }

  // ─── Admin: find rider by id ──────────────────────────────────────────────

  @Get(':id')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get rider by ID (Platform Admin)' })
  @ApiParam({ name: 'id', description: 'Rider ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Rider profile returned' })
  @ApiResponse({ status: 404, description: 'Rider not found' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.riderService.findById(id);
  }

  // ─── Admin: approve or reject rider ──────────────────────────────────────

  @Patch(':id/approve')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Approve or reject a rider (Platform Admin)' })
  @ApiParam({ name: 'id', description: 'Rider ID', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['approve'],
      properties: { approve: { type: 'boolean', example: true } },
    },
  })
  @ApiResponse({ status: 200, description: 'Approval status updated' })
  setApproval(
    @Param('id', ParseIntPipe) id: number,
    @Body('approve', ParseBoolPipe) approve: boolean,
  ) {
    return this.riderService.setApproval(id, approve);
  }
}
