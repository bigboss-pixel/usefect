import { Module } from '@nestjs/common';

import { EBooksController } from './ebooks.controller.js';
import { EBooksService } from './ebooks.service.js';

import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    EBooksController,
  ],

  providers: [
    EBooksService,
  ],

  exports: [
    EBooksService,
  ],
})
export class EBooksModule {}
