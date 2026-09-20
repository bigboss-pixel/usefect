import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { LibrarySettingsController }
  from './library-settings.controller.js';

import { LibrarySettingsService }
  from './library-settings.service.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    LibrarySettingsController,
  ],

  providers: [
    LibrarySettingsService,
  ],

  exports: [
    LibrarySettingsService,
  ],
})
export class LibrarySettingsModule {}
