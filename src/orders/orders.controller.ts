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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ClientOrderDto } from './dto/client-order.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private readonly logger = new Logger(OrdersController.name);

  @Get('/today-order')
  @ApiOperation({ summary: "Get today's total orders" })
  @ApiOkResponse({ description: 'Returns total orders placed today' })
  getTotalSalesToday() {
    this.logger.debug("Getting today's orders");
    return this.ordersService.getTotalOrderToday();
  }

  // @Get('/previous')
  // @ApiOperation({ summary: 'Get previous total orders' })
  // @ApiOkResponse({ description: 'Returns total orders placed previously' })
  // getPreviousTotalOrder() {
  //   return this.ordersService.getTotalOrderPrevious();
  // }

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiOkResponse({ description: 'The order has been successfully created' })
  @ApiBadRequestResponse({ description: 'Invalid data provided' })
  create(@Body() createOrderDto: CreateOrderDto) {
    this.logger.debug('creating a new order' + createOrderDto);
    this.logger.debug('creating a new order for ' + createOrderDto.order.name);
    return this.ordersService.create(createOrderDto);
  }

  @Post('client-order')
  @ApiOperation({ summary: 'Create a new order' })
  @ApiOkResponse({ description: 'The order has been successfully created' })
  @ApiBadRequestResponse({ description: 'Invalid data provided' })
  createClientOrder(@Body() clientOrderDto: ClientOrderDto) {
    this.logger.debug('creating a new order' + clientOrderDto);
    this.logger.debug(
      'creating a new order for ' + clientOrderDto.order.clientName,
    );
    return this.ordersService.createClientOrder(clientOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiOkResponse({ description: 'Returns a list of all orders' })
  findAll() {
    this.logger.debug('Fetching all orders');
    return this.ordersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiOkResponse({ description: 'Returns the order found by ID' })
  @ApiNotFoundResponse({ description: 'Order with the provided ID not found' })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID' })
  findOne(@Param('id') id: string) {
    this.logger.debug('Fetching a single order' + id);
    return this.ordersService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update order by ID' })
  @ApiOkResponse({ description: 'The order has been successfully updated' })
  @ApiBadRequestResponse({ description: 'Invalid data provided' })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    this.logger.debug('creating a new order' + updateOrderDto);
    return this.ordersService.update(+id, updateOrderDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete order by ID' })
  @ApiOkResponse({ description: 'The order has been successfully deleted' })
  @ApiNotFoundResponse({ description: 'Order with the provided ID not found' })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
  }

  @Put('/update-status/:id')
  @ApiOperation({ summary: 'Update order status by ID' })
  @ApiOkResponse({
    description: 'The order status has been successfully updated',
  })
  @ApiBadRequestResponse({ description: 'Invalid data provided' })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; userId: number },
  ) {
    return this.ordersService.updateFoodStatus(+id, body);
  }

  @Put('/update-payment/:id')
  @ApiOperation({ summary: 'Update order payment status by ID' })
  @ApiOkResponse({
    description: 'The order payment status has been successfully updated',
  })
  @ApiBadRequestResponse({ description: 'Invalid data provided' })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID' })
  updatePayment(@Param('id') id: string, @Body() body: { status: boolean }) {
    return this.ordersService.updatePayment(+id, body.status);
  }
  @Get('pay/success/checkout/session')
  @Redirect()
  async handleCheckoutSessionSuccess(@Query('session_id') sessionId: string) {
    return await this.ordersService.handleCheckoutSessionSuccess(sessionId);
  }

  @Get('pay/failed/checkout/session')
  @Redirect()
  async handleCheckoutSessionFailure(@Query('session_id') sessionId: string){
    return await this.ordersService.handleCheckoutSessionSuccess(sessionId);
  }
}
