import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { MemberQrController } from './member-qr.controller.js';
import { MemberQrService } from './member-qr.service.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    MemberQrController,
  ],

  providers: [
    MemberQrService,
  ],

  exports: [
    MemberQrService,
  ],
})
export class MemberQrModule {}
