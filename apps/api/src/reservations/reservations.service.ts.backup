import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { db } from '../prisma/db.js';
import { MemberQrService } from '../member-qr/member-qr.service.js';

import { CreateReservationDto } from './dto/create-reservation.dto.js';

import { NotificationsService }
  from '../notifications/notifications.service.js';

@Injectable()
export class ReservationsService {

  constructor(
    private readonly notificationsService:
      NotificationsService,

    private readonly memberQrService:
      MemberQrService,
  ) {}

  // =========================
  // GET USER ROLES
  // =========================
  private async getUserRoleNames(
    userId: number,
  ): Promise<string[]> {

    const userRoles =
      await db.orm.public.UserRole
        .where({ userId })
        .all();

    const roleNames: string[] = [];

    for (const userRole of userRoles) {
      const role =
        await db.orm.public.Role
          .where({ id: userRole.roleId })
          .first();

      if (role) {
        roleNames.push(role.name);
      }
    }

    return roleNames;
  }

  // =========================
  // CHECK LIBRARY STAFF
  // =========================
  private async isLibraryStaff(
    userId: number,
  ): Promise<boolean> {

    const roles =
      await this.getUserRoleNames(userId);

    return (
      roles.includes('LIBRARIAN') ||
      roles.includes('ADMIN')
    );
  }

  // =========================
  // CREATE RESERVATION
  // POST /reservations
  // =========================
  async create(
    userId: number,
    dto: CreateReservationDto,
  ) {

    const result =
      await db.transaction(async (tx) => {

        // =========================
        // CEK USER
        // =========================
        const user =
          await tx.orm.public.User
            .where({ id: userId })
            .first();

        if (!user) {
          throw new NotFoundException(
            'User tidak ditemukan',
          );
        }

        if (!user.isActive) {
          throw new BadRequestException(
            'User tidak aktif',
          );
        }

        // =========================
        // CEK BOOK
        // =========================
        const book =
          await tx.orm.public.Book
            .where({ id: dto.bookId })
            .first();

        if (!book) {
          throw new NotFoundException(
            'Buku tidak ditemukan',
          );
        }

        // =========================
        // CEK RESERVATION AKTIF USER
        // =========================
        const userReservations =
          await tx.orm.public.Reservation
            .where({ userId })
            .all();

        const existingReservation =
          userReservations.find(
            (reservation) =>
              reservation.bookId === dto.bookId &&
              (
                reservation.status === 'PENDING' ||
                reservation.status === 'APPROVED' ||
                reservation.status === 'READY_FOR_PICKUP'
              ),
          );

        if (existingReservation) {
          throw new BadRequestException(
            'Anda sudah memiliki reservation aktif untuk buku ini',
          );
        }

        // =========================
        // CEK LOAN AKTIF USER
        // =========================
        const userLoans =
          await tx.orm.public.Loan
            .where({ userId })
            .all();

        const alreadyBorrowed =
          userLoans.find(
            (loan) =>
              loan.status === 'ACTIVE' ||
              loan.status === 'OVERDUE',
          );

        if (alreadyBorrowed) {
          const borrowedCopy =
            await tx.orm.public.BookCopy
              .where({
                id: alreadyBorrowed.bookCopyId,
              })
              .first();

            if (
              borrowedCopy &&
              borrowedCopy.bookId === dto.bookId
            ) {
              throw new BadRequestException(
                'Anda sedang meminjam buku ini',
              );
            }
        }

        // =========================
        // CEK COPY TERSEDIA
        // =========================
        const copies =
          await tx.orm.public.BookCopy
            .where({
              bookId: dto.bookId,
            })
            .all();

        const availableCopies =
          copies.filter(
            (copy) =>
              copy.status === 'AVAILABLE',
          );

        if (availableCopies.length === 0) {
          throw new BadRequestException(
            'Tidak ada copy buku yang tersedia saat ini',
          );
        }

        // =========================
        // CEK RESERVATION AKTIF
        // =========================
        const allReservations =
          await tx.orm.public.Reservation
            .where({
              bookId: dto.bookId,
            })
            .all();

        const activeReservations =
          allReservations.filter(
            (reservation) =>
              reservation.status === 'PENDING' ||
              reservation.status === 'APPROVED' ||
              reservation.status === 'READY_FOR_PICKUP',
          );

        if (
          activeReservations.length >=
          availableCopies.length
        ) {
          throw new BadRequestException(
            'Seluruh copy buku yang tersedia sudah memiliki reservation',
          );
        }

        // =========================
        // MASA BERLAKU RESERVATION
        // =========================
        const expiresAt =
          new Date();

        // Reservation pending memiliki
        // batas waktu 24 jam untuk diproses.
        expiresAt.setHours(
          expiresAt.getHours() + 24,
        );

        // =========================
        // BUAT RESERVATION
        // =========================
        const reservation =
          await tx.orm.public.Reservation
            .create({
              userId,
              bookId: dto.bookId,
              status: 'PENDING',
              expiresAt:
                expiresAt.toISOString(),
            });

        return {
          reservation,
          book,
        };
      });

    return {
      message:
        'Reservation berhasil dibuat',
      ...result,
    };
  }

  // =========================
  // GET ALL RESERVATIONS
  // =========================
  async findAll(
    userId: number,
    status?: string,
    bookId?: number,
    targetUserId?: number,
  ) {
    const isStaff =
      await this.isLibraryStaff(userId);

    const reservations =
      await db.orm.public.Reservation.all();

    let filtered = reservations;

    // =========================
    // USER BIASA
    // =========================
    if (!isStaff) {
      filtered =
        filtered.filter(
          (reservation) =>
            reservation.userId === userId,
        );
    }

    // =========================
    // FILTER USER
    // =========================
    if (
      isStaff &&
      targetUserId !== undefined
    ) {
      filtered =
        filtered.filter(
          (reservation) =>
            reservation.userId ===
            targetUserId,
        );
    }

    // =========================
    // FILTER STATUS
    // =========================
    if (status) {
      filtered =
        filtered.filter(
          (reservation) =>
            reservation.status === status,
        );
    }

    // =========================
    // FILTER BOOK
    // =========================
    if (bookId !== undefined) {
      filtered =
        filtered.filter(
          (reservation) =>
            reservation.bookId === bookId,
        );
    }

    // =========================
    // LOAD USER + BOOK
    // =========================
    const result = [];

    for (
      const reservation of filtered
    ) {
      const user =
        await db.orm.public.User
          .where({
            id: reservation.userId,
          })
          .first();

      const book =
        await db.orm.public.Book
          .where({
            id: reservation.bookId,
          })
          .first();

      result.push({
        id: reservation.id,
        userId: reservation.userId,
        bookId: reservation.bookId,
        status: reservation.status,
        expiresAt: reservation.expiresAt,
        createdAt: reservation.createdAt,
        approvedAt: reservation.approvedAt,
        pickedUpAt: reservation.pickedUpAt,

        user: user
          ? {
              id: user.id,
              fullName: user.fullName,
              email: user.email,
            }
          : null,

        book: book
          ? {
              id: book.id,
              title: book.title,
              isbn: book.isbn,
              author: book.author,
            }
          : null,
      });
    }

    return result;
  }

  // =========================
  // GET ONE
  // =========================
  async findOne(
    id: number,
    userId: number,
  ) {

    const reservation =
      await db.orm.public.Reservation
        .where({ id })
        .first();

    if (!reservation) {
      throw new NotFoundException(
        'Reservation tidak ditemukan',
      );
    }

    const isStaff =
      await this.isLibraryStaff(userId);

    if (
      !isStaff &&
      reservation.userId !== userId
    ) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses ke reservation ini',
      );
    }

    return reservation;
  }

  // =========================
  // APPROVE
  // =========================
  async approve(
    id: number,
    userId: number,
  ) {

    if (
      !(await this.isLibraryStaff(userId))
    ) {
      throw new ForbiddenException(
        'Hanya petugas perpustakaan yang dapat menyetujui reservation',
      );
    }

    const reservation =
      await db.orm.public.Reservation
        .where({ id })
        .first();

    if (!reservation) {
      throw new NotFoundException(
        'Reservation tidak ditemukan',
      );
    }

    if (reservation.status !== 'PENDING') {
      throw new BadRequestException(
        'Reservation hanya dapat disetujui dari status PENDING',
      );
    }

    if (
      reservation.expiresAt &&
      new Date(reservation.expiresAt) <=
        new Date()
    ) {
      await db.orm.public.Reservation
        .where({ id })
        .update({
          status: 'EXPIRED',
        });

      throw new BadRequestException(
        'Reservation sudah kedaluwarsa',
      );
    }

    const updated =
      await db.orm.public.Reservation
        .where({ id })
        .update({
          status: 'READY_FOR_PICKUP',
          approvedAt:
            new Date().toISOString(),
        });

    await this.notificationsService.create(
      reservation.userId,
      'RESERVATION_APPROVED',
      'Reservasi Disetujui',
      'Reservasi buku Anda telah disetujui dan siap diambil di perpustakaan.',
    );

    return {
      message:
        'Reservation disetujui dan siap diambil',
      reservation: updated,
    };
  }

  // =========================
  // REJECT
  // =========================
  async reject(
    id: number,
    userId: number,
  ) {

    if (
      !(await this.isLibraryStaff(userId))
    ) {
      throw new ForbiddenException(
        'Hanya petugas perpustakaan yang dapat menolak reservation',
      );
    }

    const reservation =
      await db.orm.public.Reservation
        .where({ id })
        .first();

    if (!reservation) {
      throw new NotFoundException(
        'Reservation tidak ditemukan',
      );
    }

    if (reservation.status !== 'PENDING') {
      throw new BadRequestException(
        'Reservation hanya dapat ditolak dari status PENDING',
      );
    }

    const updated =
      await db.orm.public.Reservation
        .where({ id })
        .update({
          status: 'REJECTED',
        });

    await this.notificationsService.create(
      reservation.userId,
      'RESERVATION_REJECTED',
      'Reservasi Ditolak',
      'Reservasi buku Anda ditolak oleh perpustakaan.',
    );

    return {
      message:
        'Reservation ditolak',
      reservation: updated,
    };
  }

  // =========================
  // CANCEL
  // =========================
  async cancel(
    id: number,
    userId: number,
  ) {

    const reservation =
      await db.orm.public.Reservation
        .where({ id })
        .first();

    if (!reservation) {
      throw new NotFoundException(
        'Reservation tidak ditemukan',
      );
    }

    const isStaff =
      await this.isLibraryStaff(userId);

    if (
      !isStaff &&
      reservation.userId !== userId
    ) {
      throw new ForbiddenException(
        'Anda tidak dapat membatalkan reservation ini',
      );
    }

    if (
      reservation.status !== 'PENDING' &&
      reservation.status !== 'APPROVED' &&
      reservation.status !== 'READY_FOR_PICKUP'
    ) {
      throw new BadRequestException(
        'Reservation tidak dapat dibatalkan dari status saat ini',
      );
    }

    const updated =
      await db.orm.public.Reservation
        .where({ id })
        .update({
          status: 'CANCELLED',
          cancelledAt:
            new Date().toISOString(),
        });

    await this.notificationsService.create(
    reservation.userId,
    'RESERVATION_CANCELLED',
    'Reservasi Dibatalkan',
    'Reservasi buku Anda telah dibatalkan.',
  );

  return {
      message:
        'Reservation dibatalkan',
      reservation: updated,
    };
  }

  // =========================
  // EXPIRE
  // =========================

  async pickup(
    id: number,
    staffUserId: number,
    userId: number,
    barcode: string,
  ) {
    if (!(await this.isLibraryStaff(staffUserId))) {
      throw new ForbiddenException(
        'Hanya petugas perpustakaan yang dapat memproses pickup reservation',
      );
    }

    return db.transaction(async (tx) => {
      const reservation =
        await tx.orm.public.Reservation.where({ id }).first();

      if (!reservation) {
        throw new NotFoundException('Reservation tidak ditemukan');
      }

      if (reservation.status !== 'READY_FOR_PICKUP') {
        throw new BadRequestException(
          'Reservation belum siap untuk diambil',
        );
      }

      if (
        reservation.expiresAt &&
        new Date(reservation.expiresAt) <= new Date()
      ) {
        await tx.orm.public.Reservation.where({ id }).update({
          status: 'EXPIRED',
          updatedAt: new Date().toISOString(),
        });

        throw new BadRequestException('Reservation sudah kedaluwarsa');
      }

      if (reservation.userId !== userId) {
        throw new BadRequestException(
          'KTM tidak sesuai dengan pemilik reservation',
        );
      }

      const user = await tx.orm.public.User.where({ id: userId }).first();

      if (!user) {
        throw new NotFoundException('User tidak ditemukan');
      }

      if (!user.isActive) {
        throw new BadRequestException('User tidak aktif');
      }

      const userLoans =
        await tx.orm.public.Loan.where({ userId }).all();

      const activeLoans = userLoans.filter(
        (loan) =>
          loan.status === 'ACTIVE' ||
          loan.status === 'OVERDUE',
      );

      if (activeLoans.length >= 3) {
        throw new BadRequestException(
          'Maksimal 3 buku dapat dipinjam',
        );
      }

      const copies =
        await tx.orm.public.BookCopy.where({ barcode }).all();

      const bookCopy = copies[0];

      if (!bookCopy) {
        throw new NotFoundException(
          'Barcode buku tidak ditemukan',
        );
      }

      if (bookCopy.bookId !== reservation.bookId) {
        throw new BadRequestException(
          'Barcode buku tidak sesuai dengan reservation',
        );
      }

      if (bookCopy.status !== 'AVAILABLE') {
        throw new BadRequestException(
          'Copy buku sudah tidak tersedia',
        );
      }

      const copyLoans =
        await tx.orm.public.Loan.where({
          bookCopyId: bookCopy.id,
        }).all();

      const existingLoan = copyLoans.find(
        (loan) =>
          loan.status === 'PENDING' ||
          loan.status === 'ACTIVE' ||
          loan.status === 'OVERDUE',
      );

      if (existingLoan) {
        throw new BadRequestException(
          'Copy buku sedang dalam proses peminjaman',
        );
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const dueDateString = dueDate.toISOString();
      const now = new Date().toISOString();

      const loan = await tx.orm.public.Loan.create({
        userId,
        bookCopyId: bookCopy.id,
        reservationId: reservation.id,
        dueDate: dueDateString,
        status: 'ACTIVE',
        borrowedAt: now,
      });

      const updatedReservation =
        await tx.orm.public.Reservation.where({
          id,
          status: 'READY_FOR_PICKUP',
        }).update({
          status: 'PICKED_UP',
          pickedUpAt: now,
          updatedAt: now,
        });

      if (!updatedReservation) {
        throw new BadRequestException(
          'Reservation gagal diproses',
        );
      }

      const updatedBookCopy =
        await tx.orm.public.BookCopy.where({
          id: bookCopy.id,
          status: 'AVAILABLE',
        }).update({
          status: 'BORROWED',
          updatedAt: now,
        });

      if (!updatedBookCopy) {
        throw new BadRequestException(
          'Copy buku gagal diperbarui',
        );
      }

      const book =
        await tx.orm.public.Book.where({
          id: bookCopy.bookId,
        }).first();

      return {
        message:
          'Reservation berhasil diambil dan peminjaman berhasil dibuat',

        reservation: {
          id: reservation.id,
          userId: reservation.userId,
          bookId: reservation.bookId,
          status: 'PICKED_UP',
          pickedUpAt: now,
        },

        loan: {
          id: loan.id,
          userId: loan.userId,
          bookCopyId: loan.bookCopyId,
          reservationId: loan.reservationId,
          borrowedAt: loan.borrowedAt,
          dueDate: loan.dueDate,
          status: loan.status,
        },

        bookCopy: {
          id: bookCopy.id,
          barcode: bookCopy.barcode,
          status: 'BORROWED',
          shelfLocation: bookCopy.shelfLocation,
          homeLocation: bookCopy.homeLocation,
        },

        book: book
          ? {
              id: book.id,
              title: book.title,
              isbn: book.isbn,
              author: book.author,
            }
          : null,
      };
    });
  }


  // =========================
  // PICKUP WITH MEMBER QR
  // =========================
  async pickupQr(
    id: number,
    staffUserId: number,
    memberQrToken: string,
    barcode: string,
  ) {
    const qrResult =
      await this.memberQrService.validateQr(
        memberQrToken,
      );

    const userId =
      qrResult.member.userId;

    return this.pickup(
      id,
      staffUserId,
      userId,
      barcode,
    );
  }


  async expire(
    id: number,
    userId: number,
  ) {

    if (
      !(await this.isLibraryStaff(userId))
    ) {
      throw new ForbiddenException(
        'Hanya petugas perpustakaan yang dapat melakukan expire reservation',
      );
    }

    const reservation =
      await db.orm.public.Reservation
        .where({ id })
        .first();

    if (!reservation) {
      throw new NotFoundException(
        'Reservation tidak ditemukan',
      );
    }

    if (
      reservation.status !== 'PENDING' &&
      reservation.status !== 'APPROVED' &&
      reservation.status !== 'READY_FOR_PICKUP'
    ) {
      throw new BadRequestException(
        'Reservation tidak dapat di-expire dari status saat ini',
      );
    }

    const updated =
      await db.orm.public.Reservation
        .where({ id })
        .update({
          status: 'EXPIRED',
        });

    return {
      message:
        'Reservation berhasil di-expire',
      reservation: updated,
    };
  }
}