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

import { PermissionsService } from './permissions.service.js';

import { CreatePermissionDto } from './dto/create-permission.dto.js';
import { UpdatePermissionDto } from './dto/update-permission.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';

import { Permissions } from '../auth/decorators/permissions.decorator.js';

@Controller('permissions')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class PermissionsController {
  constructor(
    private readonly permissionsService:
      PermissionsService,
  ) {}

  @Post()
  @Permissions('PERMISSION_MANAGE')
  create(
    @Body()
    createPermissionDto: CreatePermissionDto,
  ) {
    return this.permissionsService.create(
      createPermissionDto,
    );
  }

  @Get()
  @Permissions('PERMISSION_MANAGE')
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @Permissions('PERMISSION_MANAGE')
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('PERMISSION_MANAGE')
  update(
    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    updatePermissionDto: UpdatePermissionDto,
  ) {
    return this.permissionsService.update(
      id,
      updatePermissionDto,
    );
  }

  @Delete(':id')
  @Permissions('PERMISSION_MANAGE')
  remove(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.permissionsService.remove(id);
  }
}