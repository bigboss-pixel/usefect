import { Module } from '@nestjs/common';

import { LecturersController } from './lecturers.controller.js';
import { LecturersService } from './lecturers.service.js';

import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    LecturersController,
  ],

  providers: [
    LecturersService,
  ],
})
export class LecturersModule {}