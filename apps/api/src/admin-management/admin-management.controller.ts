import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  AdminManagementService,
} from './admin-management.service.js';

import {
  CreateAdminDto,
} from './dto/create-admin.dto.js';

import {
  UpdateAdminDto,
} from './dto/update-admin.dto.js';

import {
  UpdateAdminStatusDto,
} from './dto/update-admin-status.dto.js';

import {
  ResetAdminPasswordDto,
} from './dto/reset-admin-password.dto.js';

import {
  UpdateAdminRoleDto,
} from './dto/update-admin-role.dto.js';

import {
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard.js';

import {
  RolesGuard,
} from '../auth/guards/roles.guard.js';

import {
  PermissionsGuard,
} from '../auth/guards/permissions.guard.js';

import {
  Roles,
} from '../auth/decorators/roles.decorator.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

@Controller('admin-management')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
)
@Roles('SUPER_ADMIN')
@Permissions('USER_VIEW')
export class AdminManagementController {
  constructor(
    private readonly adminManagementService:
      AdminManagementService,
  ) {}

  @Get()
  async findAll() {
    return this.adminManagementService.findAll();
  }

  @Get(':id')
  async getAdmin(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.adminManagementService.getAdmin(id);
  }

  @Post()
  @Permissions('USER_CREATE')
  async create(
    @Req() req: any,
    @Body()
    createAdminDto: CreateAdminDto,
  ) {
    return this.adminManagementService.create(
      createAdminDto,
      req.user.userId,
    );
  }

  @Patch(':id')
  @Permissions('USER_UPDATE')
  async update(
    @Req() req: any,
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    updateAdminDto: UpdateAdminDto,
  ) {
    return this.adminManagementService.update(
      id,
      updateAdminDto,
      req.user.userId,
    );
  }

  @Patch(':id/status')
  @Permissions('USER_UPDATE')
  async updateStatus(
    @Req() req: any,
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    updateAdminStatusDto: UpdateAdminStatusDto,
  ) {
    return this.adminManagementService.updateStatus(
      id,
      updateAdminStatusDto,
      req.user.userId,
    );
  }

  @Patch(':id/password')
  @Permissions('USER_UPDATE')
  async resetPassword(
    @Req() req: any,
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    resetAdminPasswordDto: ResetAdminPasswordDto,
  ) {
    return this.adminManagementService.resetPassword(
      id,
      resetAdminPasswordDto,
      req.user.userId,
    );
  }

  @Patch(':id/role')
  @Permissions('USER_UPDATE')
  async updateRole(
    @Req() req: any,
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    updateAdminRoleDto: UpdateAdminRoleDto,
  ) {
    return this.adminManagementService.updateRole(
      id,
      updateAdminRoleDto,
      req.user.userId,
    );
  }
}
