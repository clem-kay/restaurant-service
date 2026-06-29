import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Logger,
  Redirect,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiForbiddenResponse,
  ApiBody,
} from '@nestjs/swagger';
import { FoodStatus, PaymentMethod, PaymentStatus, UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ClientOrderDto } from './dto/client-order.dto';
import { AtGuard } from 'src/guards/at.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/guards/roles.decorator';
import { RestaurantContextGuard } from 'src/guards/restaurant-context.guard';
import { GetUser } from 'src/core/decorators/get-user.decorator';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private readonly logger = new Logger(OrdersController.name);

  // ─── Restaurant-scoped endpoints (must be before :id routes) ────────────

  @Get('mine')
  @UseGuards(AtGuard, RestaurantContextGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get orders for my restaurant (Restaurant Admin / Staff)' })
  @ApiOkResponse({ description: 'Returns orders for the authenticated restaurant' })
  @ApiForbiddenResponse({ description: 'No restaurant linked to this account' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'foodStatus', required: false, enum: FoodStatus })
  @ApiQuery({ name: 'paymentStatus', required: false, enum: PaymentStatus })
  findMine(
    @GetUser('restaurantId') restaurantId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('foodStatus') foodStatus?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    return this.ordersService.findAll(page, Math.min(limit, 100), {
      restaurantId,
      foodStatus: foodStatus as FoodStatus,
      paymentStatus: paymentStatus as PaymentStatus,
    });
  }

  @Post('walkin')
  @UseGuards(AtGuard, RestaurantContextGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a walk-in order on behalf of a customer (Restaurant Staff/Admin)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['customerName', 'items'],
      properties: {
        customerName: { type: 'string' },
        customerPhone: { type: 'string' },
        note: { type: 'string' },
        items: {
          type: 'array',
          items: { type: 'object', properties: { foodMenuId: { type: 'number' }, quantity: { type: 'number' } } },
        },
      },
    },
  })
  createWalkIn(
    @GetUser('restaurantId') restaurantId: number,
    @GetUser('sub') staffId: number,
    @Body() dto: { customerName: string; customerPhone?: string; note?: string; items: { foodMenuId: number; quantity: number }[] },
  ) {
    return this.ordersService.createWalkInOrder(restaurantId, staffId, dto);
  }

  @Put('/update-status/:id')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update order food status' })
  @ApiOkResponse({ description: 'Order status updated' })
  @ApiBadRequestResponse({ description: 'Invalid data provided' })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @GetUser('sub') actorId: number,
    @GetUser('role') role: string,
  ) {
    return this.ordersService.updateFoodStatus(+id, body.status, actorId, role);
  }

  @Put('/update-payment/:id')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update order payment status' })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID' })
  updatePayment(@Param('id') id: string, @Body() body: { status: boolean }) {
    return this.ordersService.updatePayment(+id, body.status);
  }

  // ─── Today & stats (before :id) ──────────────────────────────────────────

  @Get('/today-order')
  @ApiOperation({ summary: "Get today's total orders" })
  getTotalSalesToday() {
    return this.ordersService.getTotalOrderToday();
  }

  // ─── Payment callbacks ────────────────────────────────────────────────────

  @Get('pay/success/checkout/session')
  @Redirect()
  async handleCheckoutSessionSuccess(@Query('session_id') sessionId: string) {
    return await this.ordersService.handleCheckoutSessionSuccess(sessionId);
  }

  @Get('pay/failed/checkout/session')
  @Redirect()
  async handleCheckoutSessionFailure(@Query('session_id') sessionId: string) {
    return await this.ordersService.handleCheckoutSessionSuccess(sessionId);
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  @Get()
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all orders — paginated (Platform Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max 100' })
  @ApiQuery({ name: 'foodStatus', required: false, enum: FoodStatus })
  @ApiQuery({ name: 'paymentStatus', required: false, enum: PaymentStatus })
  @ApiQuery({ name: 'paymentMethod', required: false, enum: PaymentMethod })
  @ApiQuery({ name: 'restaurantId', required: false, type: Number })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('foodStatus') foodStatus?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('restaurantId') restaurantId?: string,
  ) {
    return this.ordersService.findAll(page, Math.min(limit, 100), {
      foodStatus: foodStatus as FoodStatus,
      paymentStatus: paymentStatus as PaymentStatus,
      paymentMethod: paymentMethod as PaymentMethod,
      restaurantId: restaurantId ? +restaurantId : undefined,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order (legacy — customer-facing)' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Post('client-order')
  @ApiOperation({ summary: 'Create a client order with payment (Stripe)' })
  createClientOrder(@Body() clientOrderDto: ClientOrderDto) {
    return this.ordersService.createClientOrder(clientOrderDto);
  }

  @Get(':id')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update order (Platform Admin)' })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(+id, updateOrderDto);
  }

  @Delete(':id')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete order (Platform Admin)' })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
  }
}
