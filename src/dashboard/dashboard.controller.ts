import { Controller, Get, Logger, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { AtGuard } from 'src/guards/at.guard';
import { GetUser } from 'src/core/decorators/get-user.decorator';

@ApiTags('Dashboard')
@UseGuards(AtGuard)
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get role-aware dashboard stats' })
  @ApiQuery({ name: 'restaurantId', required: false, type: Number, description: 'PLATFORM_ADMIN only: scope to a specific restaurant' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @GetUser('sub') userId: number,
    @GetUser('role') role: string,
    @Query('restaurantId') restaurantId?: string,
  ) {
    this.logger.log(`Dashboard request: userId=${userId} role=${role}`);

    if (role === UserRole.PLATFORM_ADMIN) {
      return this.dashboardService.getPlatformStats(restaurantId ? +restaurantId : undefined);
    }

    return this.dashboardService.getRestaurantStats(userId, role as UserRole);
  }
}
