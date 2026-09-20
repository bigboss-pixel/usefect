import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MemberQrModule } from '../member-qr/member-qr.module.js';
import { ReservationsModule } from '../reservations/reservations.module.js';
import { LibrarySettingsModule } from '../library-settings/library-settings.module.js';

import { LoansController } from './loans.controller.js';
import { LoansService } from './loans.service.js';

@Module({
  imports: [
    AuthModule,
    MemberQrModule,
    ReservationsModule,
    LibrarySettingsModule,
  ],

  controllers: [LoansController],

  providers: [
    LoansService,
  ],
})
export class LoansModule {}