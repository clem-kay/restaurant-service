import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { AtGuard } from 'src/guards/at.guard';

@ApiTags('Dashboard')
@UseGuards(AtGuard)
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Get dashboard stats (Admin)',
    description: 'Returns aggregate statistics: total categories, orders, revenue, and menu item count.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics',
    schema: {
      example: {
        totalCategories: 8,
        totalOrders: 243,
        totalSales: 18750.0,
        totalFoodItems: 64,
        todayOrders: 12,
        todaySales: 975.0,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    this.logger.log('Fetching dashboard stats');
    return this.dashboardService.findAll();
  }
}
