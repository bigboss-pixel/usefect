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

import { LecturersService } from './lecturers.service.js';

import { CreateLecturerDto } from './dto/create-lecturer.dto.js';
import { UpdateLecturerDto } from './dto/update-lecturer.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';

import { Permissions } from '../auth/decorators/permissions.decorator.js';

@Controller('lecturers')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class LecturersController {
  constructor(
    private readonly lecturersService: LecturersService,
  ) {}

  @Post()
  @Permissions('LECTURER_CREATE')
  async create(
    @Body() createLecturerDto: CreateLecturerDto,
  ) {
    return this.lecturersService.create(
      createLecturerDto,
    );
  }

  @Get()
  @Permissions('LECTURER_VIEW')
  async findAll() {
    return this.lecturersService.findAll();
  }

  @Get(':id')
  @Permissions('LECTURER_VIEW')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.lecturersService.findOne(id);
  }

  @Patch(':id')
  @Permissions('LECTURER_UPDATE')
  async update(
    @Param('id', ParseIntPipe) id: number,

    @Body() updateLecturerDto: UpdateLecturerDto,
  ) {
    return this.lecturersService.update(
      id,
      updateLecturerDto,
    );
  }

  @Delete(':id')
  @Permissions('LECTURER_DELETE')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.lecturersService.remove(id);
  }
}