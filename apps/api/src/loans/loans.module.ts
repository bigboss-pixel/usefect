import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MemberQrModule } from '../member-qr/member-qr.module.js';

import { LoansController } from './loans.controller.js';
import { LoansService } from './loans.service.js';

@Module({
  imports: [
    AuthModule,
    MemberQrModule,
  ],

  controllers: [LoansController],

  providers: [
    LoansService,
  ],
})
export class LoansModule {}