import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { BookCopiesController } from './book-copies.controller.js';
import { BookCopiesService } from './book-copies.service.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    BookCopiesController,
  ],

  providers: [
    BookCopiesService,
  ],
})
export class BookCopiesModule {}