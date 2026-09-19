import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ReservationsService } from './reservations.service.js';

import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { PickupReservationDto } from './dto/pickup-reservation.dto.js';
import { StaffTransactionDto } from '../loans/dto/staff-transaction.dto.js';

import { JwtAuthGuard }
  from '../auth/guards/jwt-auth.guard.js';

import { PermissionsGuard }
  from '../auth/guards/permissions.guard.js';

import { Permissions }
  from '../auth/decorators/permissions.decorator.js';

@Controller('reservations')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class ReservationsController {

  constructor(
    private readonly reservationsService:
      ReservationsService,
  ) {}

  // =========================
  // CREATE
  // POST /reservations
  // =========================
  @Post()
  @Permissions('RESERVATION_CREATE')
  create(
    @Req() req: any,

    @Body()
    dto: CreateReservationDto,
  ) {
    return this.reservationsService.create(
      req.user.userId,
      dto,
    );
  }

  // =========================
  // GET ALL
  // GET /reservations
  // =========================
  @Get()
  @Permissions(
    'RESERVATION_VIEW',
    'RESERVATION_VIEW_OWN',
  )
  findAll(
    @Req() req: any,

    @Query('status')
    status?: string,

    @Query('bookId')
    bookId?: string,

    @Query('userId')
    userId?: string,
  ) {

    let parsedBookId:
      number | undefined;

    let parsedUserId:
      number | undefined;

    if (bookId !== undefined) {
      parsedBookId =
        Number(bookId);

      if (
        !Number.isInteger(
          parsedBookId,
        ) ||
        parsedBookId < 1
      ) {
        throw new BadRequestException(
          'bookId harus berupa bilangan bulat positif',
        );
      }
    }

    if (userId !== undefined) {
      parsedUserId =
        Number(userId);

      if (
        !Number.isInteger(
          parsedUserId,
        ) ||
        parsedUserId < 1
      ) {
        throw new BadRequestException(
          'userId harus berupa bilangan bulat positif',
        );
      }
    }

    return this.reservationsService.findAll(
      req.user.userId,
      status,
      parsedBookId,
      parsedUserId,
    );
  }

  // =========================
  // GET ONE
  // GET /reservations/:id
  // =========================
  @Get(':id')
  @Permissions(
    'RESERVATION_VIEW',
    'RESERVATION_VIEW_OWN',
  )
  findOne(
    @Req() req: any,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.reservationsService.findOne(
      id,
      req.user.userId,
    );
  }

  // =========================
  // APPROVE
  // PATCH /reservations/:id/approve
  // =========================
  @Patch(':id/approve')
  @Permissions('RESERVATION_APPROVE')
  approve(
    @Req() req: any,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.reservationsService.approve(
      id,
      req.user.userId,
    );
  }

  // =========================
  // REJECT
  // PATCH /reservations/:id/reject
  // =========================
  @Patch(':id/reject')
  @Permissions('RESERVATION_APPROVE')
  reject(
    @Req() req: any,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.reservationsService.reject(
      id,
      req.user.userId,
    );
  }

  // =========================
  // CANCEL
  // PATCH /reservations/:id/cancel
  // =========================
  @Patch(':id/cancel')
  @Permissions('RESERVATION_CANCEL')
  cancel(
    @Req() req: any,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.reservationsService.cancel(
      id,
      req.user.userId,
    );
  }

  // =========================
  // EXPIRE
  // PATCH /reservations/:id/expire
  // =========================
  @Patch(':id/pickup')
  @Permissions('RESERVATION_PICKUP')
  pickup(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PickupReservationDto,
  ) {
    return this.reservationsService.pickup(
      id,
      req.user.userId,
      dto.userId,
      dto.barcode,
    );
  }

  // =========================
  // PICKUP WITH MEMBER QR
  // POST /reservations/:id/pickup-qr
  // =========================
  @Post(':id/pickup-qr')
  @Permissions('RESERVATION_PICKUP')
  pickupQr(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StaffTransactionDto,
  ) {
    return this.reservationsService.pickupQr(
      id,
      req.user.userId,
      dto.memberQrToken,
      dto.barcode,
    );
  }

  @Patch(':id/expire')
  @Permissions('RESERVATION_APPROVE')
  expire(
    @Req() req: any,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.reservationsService.expire(
      id,
      req.user.userId,
    );
  }
}