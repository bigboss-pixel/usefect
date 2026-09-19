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

import { RolesService } from './roles.service.js';

import { CreateRoleDto }
  from './dto/create-role.dto.js';

import { UpdateRoleDto }
  from './dto/update-role.dto.js';

  import { AssignPermissionDto }
  from './dto/assign-permission.dto.js';

import { JwtAuthGuard }
  from '../auth/guards/jwt-auth.guard.js';

import { PermissionsGuard }
  from '../auth/guards/permissions.guard.js';

import { Permissions }
  from '../auth/decorators/permissions.decorator.js';

@Controller('roles')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Permissions('ROLE_MANAGE')
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
  ) {}

  @Post()
  async create(
    @Body()
    createRoleDto: CreateRoleDto,
  ) {
    return this.rolesService.create(
      createRoleDto,
    );
  }

@Post(':roleId/permissions')
  async assignPermission(
    @Param(
      'roleId',
      ParseIntPipe,
    )
    roleId: number,

    @Body()
    assignPermissionDto: AssignPermissionDto,
  ) {
    return this.rolesService.assignPermission(
      roleId,
      assignPermissionDto,
    );
  }

  @Get(':roleId/permissions')
  async getPermissions(
    @Param(
      'roleId',
      ParseIntPipe,
    )
    roleId: number,
  ) {
    return this.rolesService.getPermissions(
      roleId,
    );
  }

  @Delete(
    ':roleId/permissions/:permissionId',
  )
  async removePermission(
    @Param(
      'roleId',
      ParseIntPipe,
    )
    roleId: number,

    @Param(
      'permissionId',
      ParseIntPipe,
    )
    permissionId: number,
  ) {
    return this.rolesService.removePermission(
      roleId,
      permissionId,
    );
  }

  @Get()
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Body()
    updateRoleDto: UpdateRoleDto,
  ) {
    return this.rolesService.update(
      id,
      updateRoleDto,
    );
  }

  @Delete(':id')
  async remove(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.rolesService.remove(id);
  }
}
