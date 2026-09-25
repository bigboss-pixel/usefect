import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuditLogService } from './audit-log.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('AUDIT_LOG_VIEW')
export class AuditLogController {
  constructor(
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  async list(
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogService.list({
      action: action || undefined,
      entity: entity || undefined,
      entityId: entityId
        ? Number(entityId)
        : undefined,
      userId: userId
        ? Number(userId)
        : undefined,
      limit: limit
        ? Math.min(Math.max(Number(limit), 1), 200)
        : 100,
    });
  }
}
