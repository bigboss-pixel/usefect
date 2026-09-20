import { Module } from '@nestjs/common';

import {
  AdminManagementController,
} from './admin-management.controller.js';

import {
  AdminManagementService,
} from './admin-management.service.js';

import {
  AuditLogModule,
} from '../audit-log/audit-log.module.js';

import {
  AuthModule,
} from '../auth/auth.module.js';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
  ],

  controllers: [
    AdminManagementController,
  ],

  providers: [
    AdminManagementService,
  ],
})
export class AdminManagementModule {}
