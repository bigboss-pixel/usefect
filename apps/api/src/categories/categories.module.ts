import { Module } from '@nestjs/common';

import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';

import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    CategoriesController,
  ],

  providers: [
    CategoriesService,
  ],
})
export class CategoriesModule {}