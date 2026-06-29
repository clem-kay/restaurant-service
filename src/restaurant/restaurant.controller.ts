import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, ParseBoolPipe,
  ParseIntPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags,
} from '@nestjs/swagger';

import { UserRole } from '@prisma/client';
import { RestaurantService } from './restaurant.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { AtGuard } from 'src/guards/at.guard';
import { GetUser } from 'src/core/decorators/get-user.decorator';
import { Roles } from 'src/guards/roles.decorator';
import { RolesGuard } from 'src/guards/roles.guard';

@ApiTags('Restaurant')
@Controller('restaurant')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  @Get('nearby')
  @ApiOperation({
    summary: 'List nearby restaurants (Customer)',
    description: 'Returns open, approved restaurants within the given radius sorted by distance.',
  })
  @ApiQuery({ name: 'lat', type: Number, example: 5.6037, description: 'Customer latitude' })
  @ApiQuery({ name: 'lng', type: Number, example: -0.187, description: 'Customer longitude' })
  @ApiQuery({ name: 'radius', type: Number, required: false, example: 10, description: 'Search radius in kilometres (default: 10)' })
  @ApiResponse({ status: 200, description: 'Sorted list of nearby restaurants' })
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.restaurantService.findNearby(
      parseFloat(lat), parseFloat(lng),
      radius ? parseFloat(radius) : undefined,
    );
  }

  @Get(':id/menu')
  @ApiOperation({
    summary: 'Get restaurant menu (Customer)',
    description: 'Returns the full menu grouped by category. Only returns available items.',
  })
  @ApiParam({ name: 'id', description: 'Restaurant ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Restaurant with nested categories and menu items' })
  @ApiResponse({ status: 404, description: 'Restaurant not found or not approved' })
  getMenu(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantService.findMenuByRestaurant(id);
  }

  // ─── Restaurant Admin ─────────────────────────────────────────────────────

  @Post('register')
  @UseGuards(AtGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Self-register a restaurant (Restaurant Admin)',
    description: 'Restaurant owners submit their details for review. Created with isApproved: false pending platform admin approval.',
  })
  @ApiBody({ type: CreateRestaurantDto })
  @ApiResponse({ status: 201, description: 'Restaurant submitted for review' })
  @ApiResponse({ status: 400, description: 'Account already has a restaurant' })
  selfRegister(@GetUser('sub') accountId: number, @Body() dto: CreateRestaurantDto) {
    return this.restaurantService.selfRegister(accountId, dto);
  }

  @Patch('toggle-open')
  @UseGuards(AtGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Open or close restaurant (Restaurant Admin)',
    description: 'Toggles whether the restaurant accepts new orders.',
  })
  @ApiBody({
    schema: {
      type: 'object', required: ['isOpen'],
      properties: { isOpen: { type: 'boolean', example: true } },
    },
  })
  @ApiResponse({ status: 200, description: 'Status updated' })
  toggleOpen(@GetUser('ownerId') ownerId: number, @Body('isOpen', ParseBoolPipe) isOpen: boolean) {
    return this.restaurantService.toggleOpen(ownerId, isOpen);
  }

  @Patch('hours')
  @UseGuards(AtGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Set opening hours (Restaurant Admin)',
    description: 'Replaces all existing opening hours. dayOfWeek: 0=Sunday, 6=Saturday.',
  })
  @ApiResponse({ status: 200, description: 'Opening hours updated' })
  setHours(@GetUser('ownerId') ownerId: number, @Body() body: { hours: any[] }) {
    return this.restaurantService.updateOpeningHours(ownerId, body.hours);
  }

  // ─── Platform Admin ───────────────────────────────────────────────────────

  @Post('admin/create')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Manually create a restaurant (Platform Admin)',
    description: 'Creates a restaurant on behalf of an owner. Bypasses the approval queue.',
  })
  @ApiBody({
    schema: {
      allOf: [
        { $ref: '#/components/schemas/CreateRestaurantDto' },
        {
          type: 'object', required: ['ownerId'],
          properties: {
            ownerId: { type: 'number', example: 5 },
            isApproved: { type: 'boolean', example: true, default: true },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 201, description: 'Restaurant created and approved' })
  manualCreate(@Body() dto: CreateRestaurantDto & { ownerId: number }) {
    return this.restaurantService.manualCreate(dto);
  }

  @Patch(':id/approve')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Approve or reject a restaurant (Platform Admin)',
  })
  @ApiParam({ name: 'id', description: 'Restaurant ID', example: 3 })
  @ApiBody({
    schema: {
      type: 'object', required: ['approve'],
      properties: { approve: { type: 'boolean', example: true } },
    },
  })
  @ApiResponse({ status: 200, description: 'Approval status updated' })
  approve(@Param('id', ParseIntPipe) id: number, @Body() body: { approve: boolean }) {
    return this.restaurantService.setApproval(id, body.approve);
  }

  @Get('admin/pending')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List pending restaurant approvals (Platform Admin)' })
  @ApiResponse({ status: 200, description: 'Restaurants awaiting approval' })
  pending() {
    return this.restaurantService.findPendingApprovals();
  }

  @Get('admin/all')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all restaurants (Platform Admin)' })
  @ApiQuery({ name: 'isApproved', required: false, type: Boolean })
  @ApiQuery({ name: 'isOpen', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'All restaurants with owner info' })
  all(
    @Query('isApproved') isApproved?: string,
    @Query('isOpen') isOpen?: string,
  ) {
    return this.restaurantService.findAll({
      isApproved: isApproved !== undefined ? isApproved === 'true' : undefined,
      isOpen:     isOpen     !== undefined ? isOpen     === 'true' : undefined,
    });
  }

  @Get(':id')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get restaurant by ID (Platform Admin)' })
  @ApiParam({ name: 'id', description: 'Restaurant ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Restaurant details' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantService.findOne(id);
  }
}
