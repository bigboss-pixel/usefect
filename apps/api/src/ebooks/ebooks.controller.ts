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
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';

import { EBooksService } from './ebooks.service.js';

import { CreateEBookDto } from './dto/create-ebook.dto.js';
import { EBookQueryDto } from './dto/ebook-query.dto.js';
import { UpdateEBookDto } from './dto/update-ebook.dto.js';
import { ModerateEBookDto } from './dto/moderate-ebook.dto.js';
import { ImportStandardEbookDto } from './dto/import-standard-ebook.dto.js';

import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { StandardEbooksService } from './standard-ebooks.service.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';

@Controller('ebooks')
export class EBooksController {
  constructor(
    private readonly ebooksService: EBooksService,
    private readonly standardEbooksService: StandardEbooksService,
  ) {}

  @Post('import/standard-ebooks')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('EBOOK_CREATE')
  async importStandardEbook(
    @Req() req: any,
    @Body() dto: ImportStandardEbookDto,
  ) {
    return this.standardEbooksService.importBook(
      Number(req.user.userId),
      dto.url,
    );
  }

  // =========================================================
  // PUBLIC - E-BOOK COLLECTION
  // =========================================================

  @Get()
  async findAll(
    @Query() query: EBookQueryDto,
  ) {
    return this.ebooksService.findAll(
      query,
    );
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async findMy(
    @Req() req: any,
  ) {
    return this.ebooksService.findMy(
      req.user.userId,
    );
  }

  @Get('moderation')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('EBOOK_UPDATE')
  async findForModeration(
    @Req() req: any,
    @Query() query: EBookQueryDto,
  ) {
    return this.ebooksService.findForModeration(
      req.user.userId,
      query,
    );
  }

  @Get(':id/access')
  async getAccess(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.ebooksService.getAccess(id);
  }

  @Get(':id/file')
  async getFile(
    @Param('id', ParseIntPipe) id: number,
    @Query('token') token: string,
  ) {
    const result =
      await this.ebooksService.getFile(
        id,
        token,
      );

    return new StreamableFile(
      result.stream,
      {
        type: result.contentType,
        disposition: result.disposition,
        length: result.size,
      },
    );
  }

  @Get(':id')
  async findOne(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.ebooksService.findOne(id);
  }

  // =========================================================
  // PROTECTED - SUBMIT FOR REVIEW
  // =========================================================

  @Post(':id/submit-review')
  @UseGuards(JwtAuthGuard)
  async submitForReview(
    @Req() req: any,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.ebooksService.submitForReview(
      id,
      req.user.userId,
    );
  }

  // =========================================================
  // PROTECTED - MODERATION
  // =========================================================

  @Patch(':id/moderation')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('EBOOK_UPDATE')
  async moderate(
    @Req() req: any,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Body()
    moderateEBookDto: ModerateEBookDto,
  ) {
    return this.ebooksService.moderate(
      id,
      req.user.userId,
      moderateEBookDto,
    );
  }

  // =========================================================
  // PROTECTED - CREATE
  // =========================================================

  @Post()
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('EBOOK_CREATE')
  async create(
    @Req() req: any,

    @Body()
    createEBookDto: CreateEBookDto,
  ) {
    return this.ebooksService.create(
      req.user.userId,
      createEBookDto,
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
  @Permissions('EBOOK_UPDATE')
  async update(
    @Req() req: any,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Body()
    updateEBookDto: UpdateEBookDto,
  ) {
    return this.ebooksService.update(
      id,
      req.user.userId,
      updateEBookDto,
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
  @Permissions('EBOOK_DELETE')
  async remove(
    @Req() req: any,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.ebooksService.remove(
      id,
      req.user.userId,
    );
  }
}
