import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CategoriesService } from './categories.service.js';

import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

import { Permissions } from '../auth/decorators/permissions.decorator.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';

@Controller('categories')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
  ) {}

  @Post()
  @Permissions('CATEGORY_CREATE')
  async create(
    @Body()
    createCategoryDto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(
      createCategoryDto,
    );
  }

  @Get()
    @Permissions('CATEGORY_VIEW')
    async findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @Permissions('CATEGORY_VIEW')
  async findOne(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @Permissions('CATEGORY_UPDATE')
  async update(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Body()
    updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(
      id,
      updateCategoryDto,
    );
  }

  @Delete(':id')
  @Permissions('CATEGORY_DELETE')
  async remove(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.categoriesService.remove(id);
  }
}