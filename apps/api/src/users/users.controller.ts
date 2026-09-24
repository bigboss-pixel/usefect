import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
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
  UpdateMyAccountDto,
} from './dto/update-my-account.dto.js';

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
)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // =========================
  // GET MY ACCOUNT
  // GET /users/me
  // =========================
  @Get('me')
  async getMyAccount(
    @Req() req: any,
  ) {
    return this.usersService.findOne(
      req.user.userId,
    );
  }

  // =========================
  // UPDATE MY ACCOUNT
  // PATCH /users/me
  // =========================
  @Patch('me')
  async updateMyAccount(
    @Req() req: any,

    @Body()
    updateMyAccountDto: UpdateMyAccountDto,
  ) {
    return this.usersService.update(
      req.user.userId,
      updateMyAccountDto,
    );
  }

  // =========================
  // CHANGE MY PASSWORD
  // PATCH /users/me/password
  // =========================
  @Patch('me/password')
  async changeMyPassword(
    @Req() req: any,

    @Body()
    changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      req.user.userId,
      changePasswordDto,
    );
  }

  // =========================
  // GET ALL USERS
  // GET /users
  // =========================
  @Get()
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('USER_VIEW')
  async findAll() {
    return this.usersService.findAll();
  }

  // =========================
  // GET USER ROLES
  // GET /users/:id/roles
  // =========================
  @Get(':id/roles')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
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
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
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
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
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
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
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