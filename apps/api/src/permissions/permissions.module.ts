import { Module } from '@nestjs/common';

import { PermissionsController } from './permissions.controller.js';
import { PermissionsService } from './permissions.service.js';

import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    PermissionsController,
  ],

  providers: [
    PermissionsService,
  ],
})
export class PermissionsModule {}