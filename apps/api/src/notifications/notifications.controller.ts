import {
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';

import { JwtAuthGuard }
  from '../auth/guards/jwt-auth.guard.js';

import { PermissionsGuard }
  from '../auth/guards/permissions.guard.js';

import { Permissions }
  from '../auth/decorators/permissions.decorator.js';

@Controller('notifications')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  @Permissions('NOTIFICATION_VIEW_OWN')
  findAll(@Req() req: any) {
    return this.notificationsService.findAll(req.user.userId);
  }

  @Get('unread-count')
  @Permissions('NOTIFICATION_VIEW_OWN')
  getUnreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user.userId);
  }

  @Patch('read-all')
  @Permissions('NOTIFICATION_VIEW_OWN')
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Patch(':id/read')
  @Permissions('NOTIFICATION_VIEW_OWN')
  markAsRead(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.markAsRead(
      id,
      req.user.userId,
    );
  }
}
