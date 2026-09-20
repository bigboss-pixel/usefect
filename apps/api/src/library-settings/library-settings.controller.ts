import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { LibrarySettingsService } from './library-settings.service.js';
import { UpdateLibrarySettingsDto } from './dto/update-library-settings.dto.js';

@Controller('library-settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LibrarySettingsController {
  constructor(
    private readonly librarySettingsService: LibrarySettingsService,
  ) {}

  @Get()
  @Permissions('SYSTEM_MANAGE')
  async get() {
    return this.librarySettingsService.get();
  }

  @Patch()
  @Permissions('SYSTEM_MANAGE')
  async update(
    @Body() dto: UpdateLibrarySettingsDto,
  ) {
    return this.librarySettingsService.update(dto);
  }
}
