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
    description: 'Creates a rider profile linked to the authenticated user account. The profile starts as unapproved and unavailable.',
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
  @ApiOperation({
    summary: 'Get own rider profile',
    description: 'Returns the authenticated rider\'s profile with account information.',
  })
  @ApiResponse({ status: 200, description: 'Rider profile returned' })
  @ApiResponse({ status: 404, description: 'Rider profile not found' })
  getProfile(@GetUser('sub') accountId: number) {
    return this.riderService.getProfile(accountId);
  }

  // ─── Update own profile ───────────────────────────────────────────────────

  @Patch('me')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update own rider profile',
    description: 'Updates the authenticated rider\'s profile fields.',
  })
  @ApiBody({ type: UpdateRiderDto })
  @ApiResponse({ status: 200, description: 'Rider profile updated' })
  @ApiResponse({ status: 404, description: 'Rider profile not found' })
  updateProfile(@GetUser('sub') accountId: number, @Body() dto: UpdateRiderDto) {
    return this.riderService.updateProfile(accountId, dto);
  }

  // ─── Toggle availability ──────────────────────────────────────────────────

  @Patch('availability')
  @UseGuards(AtGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Toggle rider availability',
    description: 'Sets whether the rider is available to accept delivery assignments.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['isAvailable'],
      properties: { isAvailable: { type: 'boolean', example: true } },
    },
  })
  @ApiResponse({ status: 200, description: 'Availability status updated' })
  @ApiResponse({ status: 404, description: 'Rider profile not found' })
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
  @ApiOperation({
    summary: 'Get rider\'s deliveries',
    description: 'Returns all deliveries assigned to the authenticated rider, sorted by most recent first.',
  })
  @ApiResponse({ status: 200, description: 'List of deliveries' })
  @ApiResponse({ status: 404, description: 'Rider profile not found' })
  getDeliveries(@GetUser('sub') accountId: number) {
    return this.riderService.getDeliveries(accountId);
  }

  // ─── Get earnings ─────────────────────────────────────────────────────────

  @Get('earnings')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get rider earnings summary',
    description: 'Returns the authenticated rider\'s total earnings and number of completed deliveries.',
  })
  @ApiResponse({
    status: 200,
    description: 'Earnings summary',
    schema: {
      example: { totalEarnings: 450.5, totalDeliveries: 38 },
    },
  })
  @ApiResponse({ status: 404, description: 'Rider profile not found' })
  getEarnings(@GetUser('sub') accountId: number) {
    return this.riderService.getEarnings(accountId);
  }

  // ─── Admin: list all riders ───────────────────────────────────────────────

  @Get()
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List all riders (Platform Admin)',
    description: 'Returns all rider profiles. Supports optional filtering by approval status and availability.',
  })
  @ApiQuery({ name: 'isApproved', required: false, type: Boolean, description: 'Filter by approval status' })
  @ApiQuery({ name: 'isAvailable', required: false, type: Boolean, description: 'Filter by availability status' })
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
  @ApiOperation({
    summary: 'Get rider by ID (Platform Admin)',
    description: 'Returns a single rider profile by their numeric ID.',
  })
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
  @ApiOperation({
    summary: 'Approve or reject a rider (Platform Admin)',
    description: 'Approves or rejects a rider\'s profile, controlling whether they can accept delivery assignments.',
  })
  @ApiParam({ name: 'id', description: 'Rider ID', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['approve'],
      properties: { approve: { type: 'boolean', example: true } },
    },
  })
  @ApiResponse({ status: 200, description: 'Approval status updated' })
  @ApiResponse({ status: 404, description: 'Rider not found' })
  setApproval(
    @Param('id', ParseIntPipe) id: number,
    @Body('approve', ParseBoolPipe) approve: boolean,
  ) {
    return this.riderService.setApproval(id, approve);
  }
}
