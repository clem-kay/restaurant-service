import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CustomerService } from './customer.service';
import {
  CreateCustomerDto,
  CreateAddressDto,
  UpdateAddressDto,
  SubmitRatingDto,
} from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AtGuard } from 'src/guards/at.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/guards/roles.decorator';
import { GetUser } from 'src/core/decorators/get-user.decorator';

@ApiTags('Customer')
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  // ─── Register customer profile ────────────────────────────────────────────

  @Post('register')
  @UseGuards(AtGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Register customer profile',
    description: 'Creates a customer profile linked to the authenticated user account.',
  })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({ status: 201, description: 'Customer profile created successfully' })
  @ApiResponse({ status: 400, description: 'Customer profile already exists' })
  register(@GetUser('sub') accountId: number, @Body() dto: CreateCustomerDto) {
    return this.customerService.register(accountId, dto);
  }

  // ─── Get own profile ──────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get own customer profile',
    description: 'Returns the authenticated customer\'s profile including addresses.',
  })
  @ApiResponse({ status: 200, description: 'Customer profile returned' })
  @ApiResponse({ status: 404, description: 'Customer profile not found' })
  getProfile(@GetUser('sub') accountId: number) {
    return this.customerService.getProfile(accountId);
  }

  // ─── Update own profile ───────────────────────────────────────────────────

  @Patch('me')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update own customer profile',
    description: 'Updates the authenticated customer\'s profile fields.',
  })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({ status: 200, description: 'Customer profile updated' })
  @ApiResponse({ status: 404, description: 'Customer profile not found' })
  updateProfile(@GetUser('sub') accountId: number, @Body() dto: UpdateCustomerDto) {
    return this.customerService.updateProfile(accountId, dto);
  }

  // ─── Admin: list all customers ────────────────────────────────────────────

  @Get()
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List all customers (Platform Admin)',
    description: 'Returns all customer profiles with their account information.',
  })
  @ApiResponse({ status: 200, description: 'List of all customers' })
  findAll() {
    return this.customerService.findAll();
  }

  // ─── Admin: find customer by id ───────────────────────────────────────────

  @Get(':id')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get customer by ID (Platform Admin)',
    description: 'Returns a single customer profile by their numeric ID.',
  })
  @ApiParam({ name: 'id', description: 'Customer ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Customer profile returned' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.findById(id);
  }

  // ─── Add address ──────────────────────────────────────────────────────────

  @Post('addresses')
  @UseGuards(AtGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Add a delivery address',
    description: 'Adds a new delivery address to the authenticated customer\'s profile. Set isDefault to true to make it the primary address.',
  })
  @ApiBody({ type: CreateAddressDto })
  @ApiResponse({ status: 201, description: 'Address added successfully' })
  @ApiResponse({ status: 404, description: 'Customer profile not found' })
  addAddress(@GetUser('sub') accountId: number, @Body() dto: CreateAddressDto) {
    return this.customerService.addAddress(accountId, dto);
  }

  // ─── List addresses ───────────────────────────────────────────────────────

  @Get('addresses')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get all delivery addresses',
    description: 'Returns all delivery addresses for the authenticated customer, with the default address listed first.',
  })
  @ApiResponse({ status: 200, description: 'List of delivery addresses' })
  @ApiResponse({ status: 404, description: 'Customer profile not found' })
  getAddresses(@GetUser('sub') accountId: number) {
    return this.customerService.getAddresses(accountId);
  }

  // ─── Update address ───────────────────────────────────────────────────────

  @Patch('addresses/:id')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update a delivery address',
    description: 'Updates a specific delivery address. Only addresses belonging to the authenticated customer can be updated.',
  })
  @ApiParam({ name: 'id', description: 'Address ID', example: 1 })
  @ApiBody({ type: UpdateAddressDto })
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  updateAddress(
    @GetUser('sub') accountId: number,
    @Param('id', ParseIntPipe) addressId: number,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.customerService.updateAddress(accountId, addressId, dto);
  }

  // ─── Delete address ───────────────────────────────────────────────────────

  @Delete('addresses/:id')
  @UseGuards(AtGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete a delivery address',
    description: 'Deletes a specific delivery address. Only addresses belonging to the authenticated customer can be deleted.',
  })
  @ApiParam({ name: 'id', description: 'Address ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  deleteAddress(
    @GetUser('sub') accountId: number,
    @Param('id', ParseIntPipe) addressId: number,
  ) {
    return this.customerService.deleteAddress(accountId, addressId);
  }

  // ─── Set default address ──────────────────────────────────────────────────

  @Patch('addresses/:id/default')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Set default delivery address',
    description: 'Marks a specific address as the default delivery address, unsetting any previously set default.',
  })
  @ApiParam({ name: 'id', description: 'Address ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Default address updated' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  setDefaultAddress(
    @GetUser('sub') accountId: number,
    @Param('id', ParseIntPipe) addressId: number,
  ) {
    return this.customerService.setDefaultAddress(accountId, addressId);
  }

  // ─── Get orders ───────────────────────────────────────────────────────────

  @Get('orders')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get customer\'s orders',
    description: 'Returns all orders placed by the authenticated customer, sorted by most recent first.',
  })
  @ApiResponse({ status: 200, description: 'List of customer orders' })
  @ApiResponse({ status: 404, description: 'Customer profile not found' })
  getOrders(@GetUser('sub') accountId: number) {
    return this.customerService.getOrders(accountId);
  }

  // ─── Submit rating ────────────────────────────────────────────────────────

  @Post('ratings')
  @UseGuards(AtGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Submit a rating',
    description: 'Submits a rating for a completed order. Each order can only be rated once.',
  })
  @ApiBody({ type: SubmitRatingDto })
  @ApiResponse({ status: 201, description: 'Rating submitted successfully' })
  @ApiResponse({ status: 400, description: 'Rating already submitted for this order' })
  @ApiResponse({ status: 404, description: 'Customer profile not found' })
  submitRating(@GetUser('sub') accountId: number, @Body() dto: SubmitRatingDto) {
    return this.customerService.submitRating(accountId, dto);
  }

  // ─── Get own ratings ──────────────────────────────────────────────────────

  @Get('ratings')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get customer\'s ratings',
    description: 'Returns all ratings submitted by the authenticated customer.',
  })
  @ApiResponse({ status: 200, description: 'List of customer ratings' })
  @ApiResponse({ status: 404, description: 'Customer profile not found' })
  getMyRatings(@GetUser('sub') accountId: number) {
    return this.customerService.getMyRatings(accountId);
  }
}
