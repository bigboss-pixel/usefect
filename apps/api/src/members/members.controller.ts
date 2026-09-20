import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { MembersService } from './members.service.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('members')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
)
@Roles('ADMIN', 'SUPER_ADMIN')
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
  ) {}

  @Get()
  @Permissions('USER_VIEW')
  async findAll() {
    return this.membersService.findAll();
  }

  @Get(':id')
  @Permissions('USER_VIEW')
  async findOne(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.membersService.findOne(id);
  }

  @Patch(':id')
  @Permissions('USER_UPDATE')
  async update(
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    body: {
      fullName?: string;
      email?: string;
      username?: string;
      phone?: string;
    },
  ) {
    return this.membersService.update(id, body);
  }

  @Delete(':id')
  @Permissions('USER_UPDATE')
  async delete(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.membersService.delete(id);
  }

  @Patch(':id/status')
  @Permissions('USER_UPDATE')
  async updateStatus(
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    body: {
      isActive: boolean;
    },
  ) {
    return this.membersService.updateStatus(
      id,
      body.isActive,
    );
  }
}
