import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MemberQrModule } from '../member-qr/member-qr.module.js';
import { NotificationsModule }
  from '../notifications/notifications.module.js';

import { ReservationsController }
  from './reservations.controller.js';

import { ReservationsService }
  from './reservations.service.js';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    MemberQrModule,
  ],

  controllers: [
    ReservationsController,
  ],

  providers: [
    ReservationsService,
  ],

  exports: [
    ReservationsService,
  ],
})
export class ReservationsModule {}
