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

import { LibrarySettingsService }
  from '../library-settings/library-settings.service.js';

import { AuditLogService }
  from '../audit-log/audit-log.service.js';

@Injectable()
export class ReservationsService {

  constructor(
    private readonly notificationsService:
      NotificationsService,

    private readonly memberQrService:
      MemberQrService,

    private readonly librarySettingsService:
      LibrarySettingsService,

    private readonly auditLogService:
      AuditLogService,
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
      roles.includes('ADMIN') ||
      roles.includes('SUPER_ADMIN')
    );
  }

  // =========================
  // GET LIBRARY STAFF USERS
  // =========================
  private async getLibraryStaffUserIds(): Promise<number[]> {
    const users = await db.orm.public.User.all();
    const userIds: number[] = [];

    for (const user of users) {
      const roles = await this.getUserRoleNames(user.id);

      if (
        roles.includes('LIBRARIAN') ||
        roles.includes('ADMIN') ||
        roles.includes('SUPER_ADMIN')
      ) {
        userIds.push(user.id);
      }
    }

    return userIds;
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
        // CEK BOOK COPY
        // =========================
        const copies =
          await tx.orm.public.BookCopy
            .where({
              bookId: dto.bookId,
            })
            .all();

        // Buku harus memiliki minimal satu copy
        // agar dapat di-reservation.
        if (copies.length === 0) {
          throw new BadRequestException(
            'Buku belum memiliki copy yang dapat di-reservation',
          );
        }

        // =========================
        // CEK RESERVATION AKTIF
        // =========================
        // Reservation menggunakan sistem FIFO.
        // User tetap dapat masuk antrean meskipun
        // seluruh copy sedang dipinjam.
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

        // =========================
        // INFORMASI ANTREAN
        // =========================
        const queuePosition =
          activeReservations.filter(
            (reservation) =>
              reservation.status === 'PENDING',
          ).length + 1;

        // =========================
        // MASA BERLAKU RESERVATION
        // =========================
        // PENDING tidak memiliki expiry pickup.
        // Masa berlaku pickup ditentukan ketika
        // reservation berubah menjadi READY_FOR_PICKUP.
        const expiresAt = null;

        // =========================
        // BUAT RESERVATION
        // =========================
        const reservation =
          await tx.orm.public.Reservation
            .create({
              userId,
              bookId: dto.bookId,
              status: 'PENDING',
              expiresAt,
            });

        return {
          reservation,
          book,
          queuePosition,
        };
      });

    // =========================
    // AUDIT LOG
    // =========================
    await this.auditLogService.create({
      userId,
      action: 'RESERVATION_CREATED',
      entity: 'Reservation',
      entityId: result.reservation.id,
      description: `Reservation #${result.reservation.id} dibuat`,
      details: `Buku: ${result.book.title} | ISBN: ${result.book.isbn} | Posisi antrean: ${result.queuePosition}`,
    });

    // =========================
    // NOTIFICATION UNTUK PETUGAS
    // =========================
    const staffUserIds =
      await this.getLibraryStaffUserIds();

    for (const staffUserId of staffUserIds) {
      if (staffUserId === userId) {
        continue;
      }

      await this.notificationsService.create(
        staffUserId,
        'RESERVATION_CREATED',
        'Reservasi Baru',
        `Ada reservasi baru untuk buku "${result.book.title}". Posisi antrean: ${result.queuePosition}.`,
      );
    }

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

    // =========================
    // CEK FIFO QUEUE
    // =========================
    const reservations =
      await db.orm.public.Reservation
        .where({
          bookId: reservation.bookId,
        })
        .all();

    const earlierPendingReservations =
      reservations.filter(
        (item) =>
          item.status === 'PENDING' &&
          (
            new Date(item.createdAt).getTime() <
              new Date(reservation.createdAt).getTime() ||
            (
              new Date(item.createdAt).getTime() ===
                new Date(reservation.createdAt).getTime() &&
              item.id < reservation.id
            )
          ),
      );

    if (earlierPendingReservations.length > 0) {
      throw new BadRequestException(
        'Reservation belum dapat diproses karena masih ada reservation sebelumnya dalam antrean',
      );
    }

    // =========================
    // CEK BOOK COPY
    // =========================
    const copies =
      await db.orm.public.BookCopy
        .where({
          bookId: reservation.bookId,
        })
        .all();

    const availableCopies =
      copies.filter(
        (copy) =>
          copy.status === 'AVAILABLE',
      );

    if (availableCopies.length === 0) {
      throw new BadRequestException(
        'Belum ada copy buku yang tersedia untuk reservation ini',
      );
    }

    // =========================
    // MASA PICKUP
    // =========================
    // Masa berlaku dimulai
    // setelah reservation siap diambil.
    const reservationExpiryHours =
      await this.librarySettingsService.getReservationExpiryHours();

    const now = new Date();

    const expiresAt =
      new Date(now);

    expiresAt.setHours(
      expiresAt.getHours() + reservationExpiryHours,
    );

    const nowString =
      now.toISOString();

    const expiresAtString =
      expiresAt.toISOString();

    // =========================
    // READY FOR PICKUP
    // =========================
    const updated =
      await db.orm.public.Reservation
        .where({
          id,
          status: 'PENDING',
        })
        .update({
          status: 'READY_FOR_PICKUP',
          approvedAt: nowString,
          expiresAt: expiresAtString,
          updatedAt: nowString,
        });

    if (!updated) {
      throw new BadRequestException(
        'Reservation gagal diproses',
      );
    }

    await this.notificationsService.create(
      reservation.userId,
      'RESERVATION_APPROVED',
      'Reservasi Disetujui',
      `Reservasi buku Anda telah disetujui dan siap diambil di perpustakaan. Reservation berlaku selama ${reservationExpiryHours} jam.`, 
    );

    // =========================
    // AUDIT LOG
    // =========================
    await this.auditLogService.create({
      userId,
      action: 'RESERVATION_APPROVED',
      entity: 'Reservation',
      entityId: updated.id,
      description: `Reservation #${updated.id} disetujui`,
      details: `Status: ${updated.status} | Berlaku sampai: ${updated.expiresAt}`,
    });

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
          updatedAt:
            new Date().toISOString(),
        });

    if (!updated) {
      throw new BadRequestException(
        'Reservation gagal ditolak',
      );
    }

    await this.notificationsService.create(
      reservation.userId,
      'RESERVATION_REJECTED',
      'Reservasi Ditolak',
      'Reservasi buku Anda ditolak oleh perpustakaan.',
    );

    const nextReservation =
      await this.promoteNextReservation(
        reservation.bookId,
      );

    // =========================
    // AUDIT LOG
    // =========================
    await this.auditLogService.create({
      userId,
      action: 'RESERVATION_REJECTED',
      entity: 'Reservation',
      entityId: updated.id,
      description: `Reservation #${updated.id} ditolak`,
      details: nextReservation
        ? `Reservation berikutnya #${nextReservation.id} dipromosikan`
        : 'Tidak ada reservation berikutnya yang dipromosikan',
    });

    return {
      message:
        nextReservation
          ? 'Reservation ditolak dan reservation berikutnya siap diambil'
          : 'Reservation ditolak',
      reservation: updated,
      nextReservation,
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
          updatedAt:
            new Date().toISOString(),
        });

    if (!updated) {
      throw new BadRequestException(
        'Reservation gagal dibatalkan',
      );
    }

    await this.notificationsService.create(
      reservation.userId,
      'RESERVATION_CANCELLED',
      'Reservasi Dibatalkan',
      'Reservasi buku Anda telah dibatalkan.',
    );

    const nextReservation =
      await this.promoteNextReservation(
        reservation.bookId,
      );

    // =========================
    // AUDIT LOG
    // =========================
    await this.auditLogService.create({
      userId,
      action: 'RESERVATION_CANCELLED',
      entity: 'Reservation',
      entityId: updated.id,
      description: `Reservation #${updated.id} dibatalkan`,
      details: nextReservation
        ? `Reservation berikutnya #${nextReservation.id} dipromosikan`
        : 'Tidak ada reservation berikutnya yang dipromosikan',
    });

    return {
      message:
        nextReservation
          ? 'Reservation dibatalkan dan reservation berikutnya siap diambil'
          : 'Reservation dibatalkan',
      reservation: updated,
      nextReservation,
    };
  }

  // =========================
  // EXPIRE
  // =========================

  async pickupByMember(
    staffUserId: number,
    memberQrToken: string,
    isbn: string,
  ) {
    if (!(await this.isLibraryStaff(staffUserId))) {
      throw new ForbiddenException(
        'Hanya petugas perpustakaan yang dapat memproses pickup reservation',
      );
    }

    const qrResult =
      await this.memberQrService.validateQr(
        memberQrToken,
      );

    if (
      !qrResult.valid ||
      !qrResult.member
    ) {
      throw new ForbiddenException(
        'QR anggota tidak valid',
      );
    }

    const normalizedIsbn =
      isbn
        .replace(/[^0-9Xx]/g, '')
        .toUpperCase();

    const books =
      await db.orm.public.Book.all();

    const book =
      books.find(
        (item) =>
          item.isbn
            .replace(/[^0-9Xx]/g, '')
            .toUpperCase() === normalizedIsbn,
      );

    if (!book) {
      throw new NotFoundException(
        'ISBN buku tidak ditemukan',
      );
    }

    const reservations =
      await db.orm.public.Reservation
        .where({
          userId:
            qrResult.member.userId,
          bookId:
            book.id,
        })
        .all();

    const reservation =
      reservations.find(
        (item) =>
          item.status ===
          'READY_FOR_PICKUP',
      );

    if (!reservation) {
      throw new BadRequestException(
        'Tidak ada reservation READY_FOR_PICKUP untuk anggota dan buku ini',
      );
    }

    return this.pickup(
      reservation.id,
      staffUserId,
      memberQrToken,
      book.isbn,
    );
  }

  async pickup(
    id: number,
    staffUserId: number,
    memberQrToken: string,
    isbn: string,
  ) {
    if (!(await this.isLibraryStaff(staffUserId))) {
      throw new ForbiddenException(
        'Hanya petugas perpustakaan yang dapat memproses pickup reservation',
      );
    }

    const qrResult =
      await this.memberQrService.validateQr(
        memberQrToken,
      );

    const userId =
      qrResult.member.userId;

    let expiredBookId: number | null = null;
    let expiredReservationId: number | null = null;
    let expiredReservationUserId: number | null = null;

    const result =
      await db.transaction(async (tx) => {
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
        await tx.orm.public.Reservation.where({
          id,
          status: 'READY_FOR_PICKUP',
        }).update({
          status: 'EXPIRED',
          updatedAt: new Date().toISOString(),
        });

        expiredBookId = reservation.bookId;
        expiredReservationId = reservation.id;
        expiredReservationUserId = reservation.userId;

        return null;
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

      const maxActiveLoans =
        await this.librarySettingsService.getMaxActiveLoans();

      if (activeLoans.length >= maxActiveLoans) {
        throw new BadRequestException(
          `Maksimal ${maxActiveLoans} buku dapat dipinjam`,
        );
      }

      const normalizedCode =
        isbn
          .replace(/[^0-9Xx]/g, '')
          .toUpperCase();

      const books =
        await tx.orm.public.Book.all();

      let book =
        books.find(
          (item) =>
            item.isbn
              .replace(/[^0-9Xx]/g, '')
              .toUpperCase() === normalizedCode,
        );

      // Jika yang dipindai adalah barcode eksemplar,
      // cari BookCopy berdasarkan barcode lalu ambil Book-nya.
      if (!book) {
        const copies =
          await tx.orm.public.BookCopy.all();

        const scannedCopy =
          copies.find(
            (copy) =>
              copy.barcode &&
              copy.barcode
                .replace(/[^0-9Xx]/g, '')
                .toUpperCase() === normalizedCode,
          );

        if (scannedCopy) {
          book =
            books.find(
              (item) =>
                item.id === scannedCopy.bookId,
            );
        }
      }

      if (!book) {
        throw new NotFoundException(
          'ISBN / barcode buku tidak ditemukan',
        );
      }

      if (book.id !== reservation.bookId) {
        throw new BadRequestException(
          'ISBN buku tidak sesuai dengan reservation',
        );
      }

      const copies =
        await tx.orm.public.BookCopy
          .where({
            bookId: book.id,
          })
          .all();

      const bookCopy =
        copies.find(
          (copy) =>
            copy.status === 'AVAILABLE',
        );

      if (!bookCopy) {
        throw new BadRequestException(
          'Tidak ada copy buku yang tersedia',
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

      const loanDurationDays =
        await this.librarySettingsService.getLoanDurationDays();

      const dueDate = new Date();
      dueDate.setDate(
        dueDate.getDate() + loanDurationDays,
      );

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

    if (expiredBookId !== null) {
      await this.promoteNextReservation(
        expiredBookId,
      );

      if (
        expiredReservationId !== null &&
        expiredReservationUserId !== null
      ) {
        await this.auditLogService.create({
          userId: expiredReservationUserId,
          action: 'RESERVATION_EXPIRED',
          entity: 'Reservation',
          entityId: expiredReservationId,
          description: `Reservation #${expiredReservationId} kedaluwarsa`,
          details: `Reservation tidak diambil dalam batas waktu pickup`,
        });
      }

      throw new BadRequestException(
        'Reservation sudah kedaluwarsa',
      );
    }

    if (result?.book?.id) {
      await this.promoteNextReservation(
        result.book.id,
      );
    }

    // =========================
    // AUDIT LOG
    // =========================
    if (result) {
      await this.auditLogService.create({
        userId: staffUserId,
        action: 'RESERVATION_PICKED_UP',
        entity: 'Reservation',
        entityId: result.reservation.id,
        description: `Reservation #${result.reservation.id} diambil dan Loan #${result.loan.id} dibuat`,
        details: `User: ${result.loan.userId} | BookCopy: ${result.loan.bookCopyId} | Status: ${result.loan.status}`,
      });

      await this.auditLogService.create({
        userId: staffUserId,
        action: 'LOAN_CREATED',
        entity: 'Loan',
        entityId: result.loan.id,
        description: `Loan #${result.loan.id} dibuat dari Reservation #${result.reservation.id}`,
        details: `User: ${result.loan.userId} | BookCopy: ${result.loan.bookCopyId} | Status: ${result.loan.status}`,
      });
    }

    return result;
  }


  // =========================
  // PROMOTE NEXT RESERVATION
  // =========================
  public async promoteNextReservation(
    bookId: number,
  ) {

    const copies =
      await db.orm.public.BookCopy
        .where({
          bookId,
        })
        .all();

    const availableCopies =
      copies.filter(
        (copy) =>
          copy.status === 'AVAILABLE',
      );

    const reservations =
      await db.orm.public.Reservation
        .where({
          bookId,
        })
        .all();

    // =========================
    // LAZY EXPIRY
    // =========================
    const now =
      new Date();

    const nowString =
      now.toISOString();

    const expiredReservations =
      reservations.filter(
        (reservation) =>
          reservation.status === 'READY_FOR_PICKUP' &&
          reservation.expiresAt &&
          new Date(reservation.expiresAt).getTime() <= now.getTime(),
      );

    for (
      const expiredReservation
      of expiredReservations
    ) {
      await db.orm.public.Reservation
        .where({
          id: expiredReservation.id,
          status: 'READY_FOR_PICKUP',
        })
        .update({
          status: 'EXPIRED',
          updatedAt: nowString,
        });
    }

    // =========================
    // REFRESH RESERVATIONS
    // =========================
    const refreshedReservations =
      await db.orm.public.Reservation
        .where({
          bookId,
        })
        .all();

    const readyReservations =
      refreshedReservations.filter(
        (reservation) =>
          reservation.status === 'READY_FOR_PICKUP' &&
          reservation.expiresAt &&
          new Date(reservation.expiresAt).getTime() > now.getTime(),
      );

    // =========================
    // AVAILABLE CAPACITY
    // =========================
    const availableCapacity =
      availableCopies.length -
      readyReservations.length;

    if (availableCapacity <= 0) {
      return null;
    }

    // =========================
    // FIFO QUEUE
    // =========================
    const pendingReservations =
      refreshedReservations
        .filter(
          (reservation) =>
            reservation.status === 'PENDING',
        )
        .sort(
          (a, b) => {
            const timeDifference =
              new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime();

            if (timeDifference !== 0) {
              return timeDifference;
            }

            return a.id - b.id;
          },
        );

    const nextReservation =
      pendingReservations[0];

    if (!nextReservation) {
      return null;
    }

    // =========================
    // PICKUP WINDOW
    // =========================
    const reservationExpiryHours =
      await this.librarySettingsService.getReservationExpiryHours();

    const expiresAt =
      new Date(now);

    expiresAt.setHours(
      expiresAt.getHours() + reservationExpiryHours,
    );

    const expiresAtString =
      expiresAt.toISOString();

    // =========================
    // PROMOTE
    // =========================
    const updated =
      await db.orm.public.Reservation
        .where({
          id: nextReservation.id,
          status: 'PENDING',
        })
        .update({
          status: 'READY_FOR_PICKUP',
          approvedAt: nowString,
          expiresAt: expiresAtString,
          updatedAt: nowString,
        });

    if (!updated) {
      return null;
    }

    // =========================
    // NOTIFICATION
    // =========================
    await this.notificationsService.create(
      nextReservation.userId,
      'RESERVATION_APPROVED',
      'Reservasi Siap Diambil',
      `Reservasi Anda sekarang siap diambil. Silakan datang ke perpustakaan dalam waktu ${reservationExpiryHours} jam.`, 
    );

    return updated;
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
      reservation.status !== 'READY_FOR_PICKUP'
    ) {
      throw new BadRequestException(
        'Hanya reservation READY_FOR_PICKUP yang dapat di-expire',
      );
    }

    const now =
      new Date();

    if (
      !reservation.expiresAt ||
      new Date(reservation.expiresAt) > now
    ) {
      throw new BadRequestException(
        'Reservation belum melewati masa berlaku pickup',
      );
    }

    const updated =
      await db.orm.public.Reservation
        .where({
          id,
          status: 'READY_FOR_PICKUP',
        })
        .update({
          status: 'EXPIRED',
          updatedAt:
            now.toISOString(),
        });

    if (!updated) {
      throw new BadRequestException(
        'Reservation gagal di-expire',
      );
    }

    const nextReservation =
      await this.promoteNextReservation(
        reservation.bookId,
      );

    await this.auditLogService.create({
      userId: reservation.userId,
      action: 'RESERVATION_EXPIRED',
      entity: 'Reservation',
      entityId: updated.id,
      description: `Reservation #${updated.id} kedaluwarsa`,
      details: nextReservation
        ? `Reservation berikutnya #${nextReservation.id} dipromosikan`
        : 'Tidak ada reservation berikutnya yang dipromosikan',
    });

    return {
      message:
        nextReservation
          ? 'Reservation berhasil di-expire dan reservation berikutnya siap diambil'
          : 'Reservation berhasil di-expire',
      reservation: updated,
      nextReservation,
    };
  }
}