import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { BooksService } from './books.service.js';

import { CreateBookDto } from './dto/create-book.dto.js';

import { BookQueryDto } from './dto/book-query.dto.js';

import { UpdateBookDto } from './dto/update-book.dto.js';

import { Permissions } from '../auth/decorators/permissions.decorator.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';

@Controller('books')
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
  ) {}

  // =========================================================
  // PUBLIC OPAC
  // =========================================================

  @Get()
  async findAll(
    @Query() query: BookQueryDto,
  ) {
    return this.booksService.findAll(query);
  }

  @Get(':id')
  async findOne(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.booksService.findOne(id);
  }

  // =========================================================
  // PROTECTED - CREATE
  // =========================================================

  @Post()
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('BOOK_CREATE')
  async create(
    @Body() createBookDto: CreateBookDto,
  ) {
    return this.booksService.create(
      createBookDto,
    );
  }

  // =========================================================
  // PROTECTED - UPDATE
  // =========================================================

  @Patch(':id')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('BOOK_UPDATE')
  async update(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Body()
    updateBookDto: UpdateBookDto,
  ) {
    return this.booksService.update(
      id,
      updateBookDto,
    );
  }

  // =========================================================
  // PROTECTED - DELETE
  // =========================================================

  @Delete(':id')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('BOOK_DELETE')
  async remove(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.booksService.remove(id);
  }
}