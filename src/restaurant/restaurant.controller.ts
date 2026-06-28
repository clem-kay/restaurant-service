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
    description: 'Returns open, approved restaurants within the given radius sorted by distance. Pass the customer\'s current GPS coordinates.',
  })
  @ApiQuery({ name: 'lat', type: Number, example: 5.6037, description: 'Customer latitude' })
  @ApiQuery({ name: 'lng', type: Number, example: -0.187, description: 'Customer longitude' })
  @ApiQuery({ name: 'radius', type: Number, required: false, example: 10, description: 'Search radius in kilometres (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Sorted list of nearby restaurants',
    schema: {
      example: [
        {
          id: 1, name: 'Mama Afrika Kitchen', address: '14 Oxford St, Accra',
          deliveryFee: 5, estimatedMinutes: 25, isOpen: true, distanceKm: 1.2,
          logo: 'https://...', coverImage: 'https://...',
        },
      ],
    },
  })
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
    description: 'Returns the full menu for a restaurant, grouped by category. Only returns available items.',
  })
  @ApiParam({ name: 'id', description: 'Restaurant ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Restaurant with nested categories and menu items',
    schema: {
      example: {
        id: 1, name: 'Mama Afrika Kitchen',
        categories: [
          {
            id: 2, name: 'Grills',
            menu: [{ id: 5, name: 'Grilled Tilapia', price: 45.0, imageUrl: 'https://...', description: '...', isAvailable: true }],
          },
        ],
      },
    },
  })
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
    description: 'Restaurant owners submit their details for review. The restaurant is created with `isApproved: false` and becomes visible only after a platform admin approves it via `PATCH /restaurant/:id/approve`.',
  })
  @ApiBody({ type: CreateRestaurantDto })
  @ApiResponse({
    status: 201,
    description: 'Restaurant submitted for review',
    schema: { example: { id: 3, name: 'New Place', isApproved: false, message: 'Your restaurant is under review...' } },
  })
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
    description: 'Toggles whether the restaurant accepts new orders. Closed restaurants are hidden from customer search results.',
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
    description: 'Replaces all existing opening hours with the provided schedule. `dayOfWeek`: 0=Sunday, 6=Saturday.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['hours'],
      properties: {
        hours: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dayOfWeek: { type: 'number', example: 1 },
              openTime: { type: 'string', example: '09:00' },
              closeTime: { type: 'string', example: '22:00' },
              isClosed: { type: 'boolean', example: false },
            },
          },
        },
      },
    },
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
    description: 'Creates a restaurant on behalf of an owner. Bypasses the approval queue — restaurant is active immediately unless `isApproved: false` is explicitly set.',
  })
  @ApiBody({
    schema: {
      allOf: [
        { $ref: '#/components/schemas/CreateRestaurantDto' },
        {
          type: 'object', required: ['ownerId'],
          properties: {
            ownerId: { type: 'number', example: 5, description: 'ID of the RESTAURANT_ADMIN account to assign as owner' },
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
    description: 'Approves a self-registered restaurant (making it visible to customers) or rejects it.',
  })
  @ApiParam({ name: 'id', description: 'Restaurant ID', example: 3 })
  @ApiBody({
    schema: {
      type: 'object', required: ['approve'],
      properties: { approve: { type: 'boolean', example: true } },
    },
  })
  @ApiResponse({ status: 200, description: 'Approval status updated' })
  approve(@Param('id', ParseIntPipe) id: number, @Body('approve', ParseBoolPipe) approve: boolean) {
    return this.restaurantService.setApproval(id, approve);
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
  @ApiOperation({ summary: 'List all restaurants (Platform Admin)', description: 'Supports optional filtering by approval status and open/closed state.' })
  @ApiQuery({ name: 'isApproved', required: false, type: Boolean, description: 'Filter by approval status (true/false)' })
  @ApiQuery({ name: 'isOpen', required: false, type: Boolean, description: 'Filter by open status (true/false)' })
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
}
