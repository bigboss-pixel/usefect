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

import { StudentsService } from './students.service.js';

import { CreateStudentDto } from './dto/create-student.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';

import { Permissions } from '../auth/decorators/permissions.decorator.js';

@Controller('students')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
  ) {}

  @Post()
  @Permissions('STUDENT_CREATE')
  async create(
    @Body() createStudentDto: CreateStudentDto,
  ) {
    return this.studentsService.create(
      createStudentDto,
    );
  }

  @Get()
  @Permissions('STUDENT_VIEW')
  async findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  @Permissions('STUDENT_VIEW')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('STUDENT_UPDATE')
  async update(
    @Param('id', ParseIntPipe) id: number,

    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.update(
      id,
      updateStudentDto,
    );
  }

    @Delete(':id')
  @Permissions('STUDENT_DELETE')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.studentsService.remove(id);
  }

}