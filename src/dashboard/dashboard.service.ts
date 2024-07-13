import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryService } from 'src/category/category.service';
import { FoodmenuService } from 'src/foodmenu/foodmenu.service';
import { OrdersService } from 'src/orders/orders.service';
import { DashBoardStats } from 'src/types/stats.type'

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private readonly categoryService: CategoryService,
    private readonly foodMenuService: FoodmenuService,
    private readonly orderService: OrdersService,
  ) {}

  private readonly logger = new Logger(DashboardService.name);

  create(createDashboardDto: CreateDashboardDto) {
    return 'This action adds a new dashboard';
  }

  async findAll() {
    this.logger.log('Getting all the stats from the database')
    //categories
    const allCategories = await this.categoryService.findTotalCategories()
    //orders
    const allOrders = await this.orderService.findTotalOrders()
    const totalOrdersForToday = await this.orderService.getTotalOrderToday()
    this.logger.log('Calculating the total sales for today')
    const totalTodaySales = totalOrdersForToday.reduce((sum, item) => sum + item.totalAmount, 0);

    //foodmenu
    this.logger.log('Gettng the total menu')
    const totalFoodMenu =  await this.foodMenuService.findTotalFoodMenu()


    return {
      'totalCategory' : allCategories,
      'totalorder':allOrders,
      'totalOrdersForToday':totalOrdersForToday.length,
      'totalTodaySales':`${totalTodaySales} cedis`,
      'totalFoodMenu':totalFoodMenu
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} dashboard`;
  }

  update(id: number, updateDashboardDto: UpdateDashboardDto) {
    return `This action updates a #${id} dashboard`;
  }

  remove(id: number) {
    return `This action removes a #${id} dashboard`;
  }
  
 
  async getTotalOrders(){
    return this.orderService.findAll.length;
  }
  async getTodayOrders(){
    return this.orderService.getTotalOrderToday.length;

  }
  async getSalesForPreviousMonth(){

  }
  


}
