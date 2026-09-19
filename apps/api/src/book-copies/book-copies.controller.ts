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

import { BookCopiesService } from './book-copies.service.js';

import { CreateBookCopyDto } from './dto/create-book-copy.dto.js';
import { CreateManyBookCopiesDto } from './dto/create-many-book-copies.dto.js';
import { UpdateBookCopyDto } from './dto/update-book-copy.dto.js';

import { Permissions } from '../auth/decorators/permissions.decorator.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';

@Controller('book-copies')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class BookCopiesController {
  constructor(
    private readonly bookCopiesService: BookCopiesService,
  ) {}

@Post('bulk/:bookId')
  @Permissions('BOOK_COPY_CREATE')
  async createMany(
    @Param(
      'bookId',
      ParseIntPipe,
    )
    bookId: number,

    @Body()
    createManyBookCopiesDto: CreateManyBookCopiesDto,
  ) {
    return this.bookCopiesService.createMany(
      bookId,
      createManyBookCopiesDto,
    );
  }

  @Post()
  @Permissions('BOOK_COPY_CREATE')
  async create(
    @Body()
    createBookCopyDto: CreateBookCopyDto,
  ) {
    return this.bookCopiesService.create(
      createBookCopyDto,
    );
  }

  @Get()
  @Permissions('BOOK_COPY_VIEW')
  async findAll() {
    return this.bookCopiesService.findAll();
  }

  @Get(':id')
  @Permissions('BOOK_COPY_VIEW')
  async findOne(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.bookCopiesService.findOne(id);
  }

  @Patch(':id')
  @Permissions('BOOK_COPY_UPDATE')
  async update(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Body()
    updateBookCopyDto: UpdateBookCopyDto,
  ) {
    return this.bookCopiesService.update(
      id,
      updateBookCopyDto,
    );
  }

  @Delete(':id')
  @Permissions('BOOK_COPY_DELETE')
  async remove(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.bookCopiesService.remove(id);
  }
}