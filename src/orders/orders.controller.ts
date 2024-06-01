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
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private readonly logger = new Logger(OrdersController.name);
  @Get('/today-order')
  getTotalSalesToday(){
    this.logger.debug('getting today\'s order')
    return this.ordersService.getTotalOrderToday();
  }
  @Get('/previous')
  getPreviousTotalOrder(){
    return this.ordersService.getTotalOrderPrevious()
  }

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    console.log(createOrderDto);
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(+id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
  }

  @Put('/update-status/:id')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; userId: number },
  ) {
    return this.ordersService.updateFoodStatus(+id, body);
  }

  @Put('/update-payment/:id')
  updatePayment(@Param('id') id: string, @Body() body: { status: boolean }) {
    return this.ordersService.updatePayment(+id, body.status);
  }

  // @Get('/total-orders')
  // getTotalOrderToday() { 
  //   this.ordersService.getTotalOrderToday();
  // }
}
