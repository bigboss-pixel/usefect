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

import { LoansService } from './loans.service.js';

import { CreateLoanDto } from './dto/create-loan.dto.js';
import { StaffDirectTransactionDto } from './dto/staff-direct-transaction.dto.js';
import { StaffReturnTransactionDto } from './dto/staff-return-transaction.dto.js';

import { JwtAuthGuard }
  from '../auth/guards/jwt-auth.guard.js';

import { PermissionsGuard }
  from '../auth/guards/permissions.guard.js';

import { Permissions }
  from '../auth/decorators/permissions.decorator.js';

@Controller('loans')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class LoansController {
  constructor(
    private readonly loansService: LoansService,
  ) {}

  // =========================
  // CREATE LOAN
  // POST /loans
  // =========================
  @Post()
  @Permissions('LOAN_CREATE')
  create(
    @Req() req: any,

    @Body()
    createLoanDto: CreateLoanDto,
  ) {
    return this.loansService.create(
      req.user.userId,
      createLoanDto,
    );
  }

  // =========================
  // STAFF DIRECT TRANSACTION
  // POST /loans/staff-transaction
  // =========================
  @Post('staff-transaction')
  @Permissions('LOAN_CREATE')
  staffTransaction(
    @Body()
    staffTransactionDto: StaffDirectTransactionDto,
  ) {
    return this.loansService.staffTransaction(
      staffTransactionDto.memberQrToken,
      staffTransactionDto.isbn,
    );
  }

  // =========================
  // STAFF RETURN PREVIEW
  // POST /loans/staff-return-preview
  // =========================
  @Post('staff-return-preview')
  @Permissions('LOAN_RETURN')
  staffReturnPreview(
    @Body('memberQrToken')
    memberQrToken: string,
    @Body('isbn')
    isbn: string,
    @Body('loanId')
    loanId?: number,
  ) {
    return this.loansService.staffReturnPreview(
      memberQrToken,
      isbn,
      loanId,
    );
  }

  // =========================
  // STAFF RETURN TRANSACTION
  // POST /loans/staff-return
  // =========================
  @Post('staff-return')
  @Permissions('LOAN_RETURN')
  staffReturn(
    @Body()
    staffReturnDto: StaffReturnTransactionDto,
  ) {
    return this.loansService.staffReturnTransaction(
      staffReturnDto.memberQrToken,
      staffReturnDto.isbn,
      staffReturnDto.condition,
      staffReturnDto.shelfConfirmed,
      staffReturnDto.loanId,
    );
  }

  // =========================
  // CANCEL LOAN
  // PATCH /loans/:id/cancel
  // =========================
  @Patch(':id/cancel')
  @Permissions('LOAN_CANCEL')
  cancel(
    @Req() req: any,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.loansService.cancel(
      id,
      req.user.userId,
    );
  }

  // =========================
  // REJECT LOAN
  // PATCH /loans/:id/reject
  // =========================
  @Patch(':id/reject')
  @Permissions('LOAN_REJECT')
  reject(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.loansService.reject(id);
  }

  // =========================
  // GET ALL LOANS
  // GET /loans
  // =========================
  @Get()
  @Permissions(
  'LOAN_VIEW',
  'LOAN_VIEW_OWN',
)
  findAll(
    @Req() req: any,

    @Query('status')
    status?: string,

    @Query('userId')
    userId?: string,

    @Query('bookCopyId')
    bookCopyId?: string,

    @Query('returnRequestStatus')
    returnRequestStatus?: string,

    @Query('search')
    search?: string,

    @Query('sortBy')
    sortBy?: string,

    @Query('order')
    order?: string,

    @Query('page')
    page?: string,

    @Query('limit')
    limit?: string,
  ) {
    // =========================
    // VALIDASI USER ID
    // =========================
    if (userId !== undefined) {
      const parsedUserId =
        Number(userId);

      if (Number.isNaN(parsedUserId)) {
        throw new BadRequestException(
          'userId harus berupa angka yang valid',
        );
      }

      if (!Number.isInteger(parsedUserId)) {
        throw new BadRequestException(
          'userId harus berupa bilangan bulat',
        );
      }

      if (parsedUserId < 1) {
        throw new BadRequestException(
          'userId harus lebih besar dari 0',
        );
      }
    }

    // =========================
    // VALIDASI BOOK COPY ID
    // =========================
    if (bookCopyId !== undefined) {
      const parsedBookCopyId =
        Number(bookCopyId);

      if (Number.isNaN(parsedBookCopyId)) {
        throw new BadRequestException(
          'bookCopyId harus berupa angka yang valid',
        );
      }

      if (!Number.isInteger(parsedBookCopyId)) {
        throw new BadRequestException(
          'bookCopyId harus berupa bilangan bulat',
        );
      }

      if (parsedBookCopyId < 1) {
        throw new BadRequestException(
          'bookCopyId harus lebih besar dari 0',
        );
      }
    }

    return this.loansService.findAll(
      req.user.userId,

      status,

      userId
        ? Number(userId)
        : undefined,

      bookCopyId
        ? Number(bookCopyId)
        : undefined,

      search,

      returnRequestStatus,

      sortBy,

      order,

      page
        ? Number(page)
        : undefined,

      limit
        ? Number(limit)
        : undefined,
    );
  }

  // =========================
  // LOAN STATISTICS
  // GET /loans/statistics
  // =========================
  @Get('statistics')
  @Permissions('LOAN_STATISTICS')
  getStatistics() {
    return this.loansService.getStatistics();
  }

  // =========================
  // GET LOAN BY ID
  // GET /loans/:id
  // =========================
  @Get(':id')
  @Permissions(
  'LOAN_VIEW',
  'LOAN_VIEW_OWN',
  )
  
  findOne(
    @Req() req: any,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.loansService.findOne(
      id,
      req.user.userId,
    );
  }

  // =========================
  // REQUEST RETURN
  // POST /loans/:id/return-request
  // =========================
  @Post(':id/return-request')
  @Permissions('LOAN_VIEW_OWN')
  requestReturn(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.loansService.requestReturn(
      id,
      req.user.userId,
    );
  }

  // =========================
  // RETURN BOOK
  // PATCH /loans/:id/return
  // =========================
  @Patch(':id/return')
  @Permissions('LOAN_RETURN')
  returnBook(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.loansService.returnBook(id);
  }

  @Patch(':id/renew')
  @Permissions('LOAN_VIEW_OWN')
  renew(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.loansService.renew(
      id,
      req.user.userId,
    );
  }

  // =========================
  // MARK BOOK AS LOST
  // PATCH /loans/:id/lost
  // =========================
  @Patch(':id/lost')
  @Permissions('LOAN_RETURN')
  markAsLost(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.loansService.markAsLost(id);
  }

  // =========================
  // MARK BOOK AS DAMAGED
  // PATCH /loans/:id/damaged
  // =========================
  @Patch(':id/damaged')
  @Permissions('LOAN_RETURN')
  markAsDamaged(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.loansService.markAsDamaged(id);
  }

  // =========================
  // APPROVE LOAN
  // PATCH /loans/:id/approve
  // =========================
  @Patch(':id/approve')
  @Permissions('LOAN_APPROVE')
  approve(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.loansService.approve(id);
  }
}