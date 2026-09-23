import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { MembersService } from './members.service.js';
import { CreateMemberDto } from './dto/create-member.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';
import { ResetMemberPasswordDto } from './dto/reset-member-password.dto.js';

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

  @Post()
  @Roles('SUPER_ADMIN')
  async create(
    @Body() createMemberDto: CreateMemberDto,
  ) {
    return this.membersService.create(
      createMemberDto,
    );
  }

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
    @Body() updateMemberDto: UpdateMemberDto,
  ) {
    return this.membersService.update(
      id,
      updateMemberDto,
    );
  }

  @Patch(':id/password')
  @Roles('SUPER_ADMIN')
  @Permissions('USER_UPDATE')
  async resetPassword(
    @Param('id', ParseIntPipe)
    id: number,
    @Body() resetMemberPasswordDto: ResetMemberPasswordDto,
  ) {
    return this.membersService.resetPassword(
      id,
      resetMemberPasswordDto.password,
    );
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
