import { Controller, Get, HttpCode, HttpStatus, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AtGuard } from 'src/guards/at.guard';
import { GetUser } from 'src/core/decorators/get-user.decorator';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@UseGuards(AtGuard)
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all notifications for the authenticated user' })
  findAll(@GetUser('sub') userId: number) {
    return this.notificationService.findForUser(userId);
  }

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get unread notification count' })
  async unreadCount(@GetUser('sub') userId: number) {
    const count = await this.notificationService.unreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(@Param('id') id: string, @GetUser('sub') userId: number) {
    return this.notificationService.markRead(+id, userId);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@GetUser('sub') userId: number) {
    return this.notificationService.markAllRead(userId);
  }
}
