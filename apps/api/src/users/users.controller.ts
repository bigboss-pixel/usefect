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

import {
  UsersService,
} from './users.service.js';

import {
  UpdateUserDto,
} from './dto/update-user.dto.js';

import {
  ChangePasswordDto,
} from './dto/change-password.dto.js';

import {
  AssignRoleDto,
} from './dto/assign-role.dto.js';

import {
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard.js';

import {
  PermissionsGuard,
} from '../auth/guards/permissions.guard.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

import {
  Roles,
} from '../auth/decorators/roles.decorator.js';

import {
  RolesGuard,
} from '../auth/guards/roles.guard.js';

@Controller('users')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // =========================
  // GET ALL USERS
  // GET /users
  // =========================
  @Get()
  @Permissions('USER_VIEW')
  async findAll() {
    return this.usersService.findAll();
  }

  // =========================
  // GET USER ROLES
  // GET /users/:id/roles
  // =========================
  @Get(':id/roles')
  @Permissions('USER_VIEW')
  async getRoles(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.usersService.getRoles(
      id,
    );
  }

  // =========================
  // ASSIGN ROLE TO USER
  // POST /users/:id/roles
  // =========================
  @Post(':id/roles')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
  )
  @Roles('SUPER_ADMIN')
  @Permissions('USER_UPDATE')
  async assignRole(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Body()
    assignRoleDto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(
      id,
      assignRoleDto,
    );
  }

  // =========================
  // REMOVE ROLE FROM USER
  // DELETE /users/:id/roles/:roleId
  // =========================
  @Delete(':id/roles/:roleId')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
  )
  @Roles('SUPER_ADMIN')
  @Permissions('USER_UPDATE')
  async removeRole(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Param(
      'roleId',
      ParseIntPipe,
    )
    roleId: number,
  ) {
    return this.usersService.removeRole(
      id,
      roleId,
    );
  }

  // =========================
  // GET USER BY ID
  // GET /users/:id
  // =========================
  @Get(':id')
  @Permissions('USER_VIEW')
  async findOne(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.usersService.findOne(
      id,
    );
  }

  // =========================
  // CHANGE USER PASSWORD
  // PATCH /users/:id/password
  // =========================
  @Patch(':id/password')
  @Permissions('USER_UPDATE')
  async changePassword(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Body()
    changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      id,
      changePasswordDto,
    );
  }

  // =========================
  // UPDATE USER
  // PATCH /users/:id
  // =========================
  @Patch(':id')
  @Permissions('USER_UPDATE')
  async update(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Body()
    updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(
      id,
      updateUserDto,
    );
  }
}