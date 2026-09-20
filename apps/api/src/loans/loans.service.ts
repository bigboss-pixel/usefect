import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { db } from '../prisma/db.js';

import { CreateLoanDto } from './dto/create-loan.dto.js';
import { MemberQrService } from '../member-qr/member-qr.service.js';
import { ReservationsService } from '../reservations/reservations.service.js';
import { LibrarySettingsService } from '../library-settings/library-settings.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';

@Injectable()

  export class LoansService {

  constructor(
    private readonly memberQrService: MemberQrService,
    private readonly reservationsService: ReservationsService,
    private readonly librarySettingsService: LibrarySettingsService,
    private readonly auditLogService: AuditLogService,
  ) {}


  // =========================
  // GET USER ROLES
  // =========================
  private async getUserRoleNames(
    userId: number,
  ): Promise<string[]> {

    const userRoles =
      await db.orm.public.UserRole
        .where({
          userId,
        })
        .all();

    const roleNames: string[] = [];

    for (
      const userRole of userRoles
    ) {
      const role =
        await db.orm.public.Role
          .where({
            id: userRole.roleId,
          })
          .first();

      if (role) {
        roleNames.push(
          role.name,
        );
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
      await this.getUserRoleNames(
        userId,
      );

    return (
      roles.includes('LIBRARIAN') ||
      roles.includes('ADMIN')
    );
  }
  
  // =========================
  // CREATE LOAN
  // =========================
    async create(
    userId: number,
    createLoanDto: CreateLoanDto,
  ) {
    const {
      bookCopyId,
      dueDate,
    } = createLoanDto;

    // =========================
    // VALIDASI DUE DATE
    // =========================
    const parsedDueDate =
      new Date(dueDate);

    if (
      Number.isNaN(
        parsedDueDate.getTime(),
      )
    ) {
      throw new BadRequestException(
        'Format dueDate tidak valid',
      );
    }

    const now = new Date();

    if (parsedDueDate <= now) {
      throw new BadRequestException(
        'Tanggal pengembalian harus di masa depan',
      );
    }

    // =========================
    // TRANSACTION
    // =========================
    const result =
      await db.transaction(async (tx) => {

        // =========================
        // CEK USER + LOCK USER
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

        // UPDATE dengan nilai yang sama
        // digunakan untuk memperoleh row lock.
        await tx.orm.public.User
          .where({ id: userId })
          .update({
            updatedAt: user.updatedAt,
          });

        // =========================
        // CEK BOOK COPY
        // =========================
        const bookCopy =
          await tx.orm.public.BookCopy
            .where({ id: bookCopyId })
            .first();

        if (!bookCopy) {
          throw new NotFoundException(
            'Copy buku tidak ditemukan',
          );
        }

        // =========================
        // LOCK BOOK COPY
        // =========================
        await tx.orm.public.BookCopy
          .where({ id: bookCopyId })
          .update({
            updatedAt:
              bookCopy.updatedAt,
          });

        // =========================
        // CEK STATUS BUKU
        // =========================
        if (
          bookCopy.status !==
          'AVAILABLE'
        ) {
          throw new BadRequestException(
            'Buku tidak tersedia untuk dipinjam',
          );
        }

        // =========================
        // CEK BATAS PEMINJAMAN
        // =========================
        const activeLoans =
          await tx.orm.public.Loan
            .where({
              userId,
              status: 'ACTIVE',
            })
            .all();

        const pendingLoans =
          await tx.orm.public.Loan
            .where({
              userId,
              status: 'PENDING',
            })
            .all();

        const totalBorrowedBooks =
          activeLoans.length +
          pendingLoans.length;

        const maxActiveLoans =
          await this.librarySettingsService.getMaxActiveLoans();

        if (
          totalBorrowedBooks >=
          maxActiveLoans
        ) {
          throw new BadRequestException(
            `Maksimal ${maxActiveLoans} buku dapat dipinjam`,
          );
        }

        // =========================
        // CEK PEMINJAMAN GANDA
        // =========================
        const bookCopyLoans =
          await tx.orm.public.Loan
            .where({ bookCopyId })
            .all();

        const existingLoan =
          bookCopyLoans.find(
            (loan) =>
              loan.status ===
                'PENDING' ||
              loan.status ===
                'ACTIVE',
          );

        if (existingLoan) {
          throw new BadRequestException(
            'Buku ini sedang dalam proses peminjaman',
          );
        }

        // =========================
        // BUAT LOAN
        // =========================
        const loan =
          await tx.orm.public.Loan
            .create({
              userId,
              bookCopyId,
              dueDate:
                parsedDueDate.toISOString(),
              status: 'PENDING',
            });

        // =========================
        // AMBIL DATA BUKU
        // =========================
        const book =
          await tx.orm.public.Book
            .where({
              id: bookCopy.bookId,
            })
            .first();

        return {
          loan,
          user,
          bookCopy,
          book,
        };
      });

    // =========================
    // AUDIT LOG
    // =========================
    await this.auditLogService.create({
      userId,
      action: 'LOAN_CREATED',
      entity: 'Loan',
      entityId: result.loan.id,
      description: `Peminjaman dibuat untuk ${result.user.fullName}`,
      details: result.book
        ? `Buku: ${result.book.title} | ISBN: ${result.book.isbn} | Copy: ${result.bookCopy.id}`
        : `Copy: ${result.bookCopy.id}`,
    });

    // =========================
    // RESPONSE
    // =========================
    return {
      message:
        'Peminjaman berhasil dibuat',

      loan: {
        id: result.loan.id,

        user: {
          id: result.user.id,
          fullName:
            result.user.fullName,
          email:
            result.user.email,
        },

        bookCopy: {
          id: result.bookCopy.id,

          barcode:
            result.bookCopy.barcode,

          status:
            result.bookCopy.status,

          book: result.book
            ? {
                id: result.book.id,
                title: result.book.title,
                isbn: result.book.isbn,
                author:
                  result.book.author,
              }
            : null,
        },

        borrowedAt:
          result.loan.borrowedAt,

        dueDate:
          result.loan.dueDate,

        returnedAt:
          result.loan.returnedAt,

        status:
          result.loan.status,

        createdAt:
          result.loan.createdAt,

        updatedAt:
          result.loan.updatedAt,
      },
    };
  }

    // =========================
  // UPDATE OVERDUE LOANS
  // =========================
  async updateOverdueLoans() {
    const loans =
      await db.orm.public.Loan
        .all();

    const now = new Date();

    for (const loan of loans) {
      const dueDate =
        new Date(loan.dueDate);

      if (
        loan.status === 'ACTIVE' &&
        dueDate < now
      ) {
        const dueDateDay = new Date(
          dueDate.getFullYear(),
          dueDate.getMonth(),
          dueDate.getDate(),
        );

        const todayDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );

        const overdueDays = Math.max(
          Math.floor(
            (todayDay.getTime() -
              dueDateDay.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
          0,
        );

        const finePerDay =
          await this.librarySettingsService.getFinePerDay();

        const fineAmount =
          overdueDays * finePerDay;

        await db.orm.public.Loan
          .where({
            id: loan.id,
            status: 'ACTIVE',
          })
          .update({
            status: 'OVERDUE',
            fineAmount,
            updatedAt:
              new Date().toISOString(),
          });
      }
    }
  }

  // =========================
  // GET ALL LOANS
  // =========================
 async findAll(
  requesterUserId: number,

  status?: string,
  userId?: number,
  bookCopyId?: number,
  search?: string,
  returnRequestStatus?: string,
  sortBy?: string,
  order?: string,
  page: number = 1,
  limit: number = 10,
)
{

  // =========================
  // CEK ROLE REQUESTER
  // =========================
  const isStaff =
    await this.isLibraryStaff(
      requesterUserId,
    );

  // =========================
  // STUDENT / LECTURER
  // HANYA BOLEH MELIHAT
  // LOAN MILIK SENDIRI
  // =========================
  if (!isStaff) {
    userId = requesterUserId;
  }

  // =========================
// VALIDASI PAGINATION
// =========================
if (page < 1) {
  throw new BadRequestException(
    'page harus lebih besar dari 0',
  );
}

if (limit < 1) {
  throw new BadRequestException(
    'limit harus lebih besar dari 0',
  );
}

if (limit > 100) {
  limit = 100;
}

// =========================
// VALIDASI STATUS
// =========================
const validStatuses = [
  'PENDING',
  'ACTIVE',
  'OVERDUE',
  'RETURNED',
  'CANCELLED',
  'REJECTED',
  'LOST',
  'DAMAGED',
];

if (status !== undefined) {
  status = status.toUpperCase();

  if (
    !validStatuses.includes(status)
  ) {
    throw new BadRequestException(
      'Status loan tidak valid',
    );
  }
}

    // Update loan yang terlambat
    await this.updateOverdueLoans();

    // =========================
// AMBIL SEMUA LOAN
// =========================
let filteredLoans =
  await db.orm.public.Loan
    .all();

// =========================
// FILTER STATUS
// =========================
if (status !== undefined) {
  filteredLoans =
    filteredLoans.filter(
      (loan) =>
        loan.status === status,
    );
}

// =========================
// FILTER USER
// =========================
if (userId !== undefined) {
  filteredLoans =
    filteredLoans.filter(
      (loan) =>
        loan.userId === userId,
    );
}

// =========================
// FILTER BOOK COPY
// =========================
if (bookCopyId !== undefined) {
  filteredLoans =
    filteredLoans.filter(
      (loan) =>
        loan.bookCopyId ===
        bookCopyId,
    );
}

// =========================
// FILTER RETURN REQUEST
// =========================
if (
  returnRequestStatus !== undefined
) {
  returnRequestStatus =
    returnRequestStatus
      .toUpperCase();

  const validReturnRequestStatuses = [
    'NONE',
    'REQUESTED',
    'COMPLETED',
  ];

  if (
    !validReturnRequestStatuses.includes(
      returnRequestStatus,
    )
  ) {
    throw new BadRequestException(
      'returnRequestStatus tidak valid',
    );
  }

  filteredLoans =
    filteredLoans.filter(
      (loan) =>
        loan.returnRequestStatus ===
        returnRequestStatus,
    );
}

// =========================
// SEARCH
// =========================
if (
  search !== undefined &&
  search.trim() !== ''
) {
  const searchTerm =
    search.toLowerCase().trim();

  const searchResults = [];

  for (
    const loan of filteredLoans
  ) {
    const user =
      await db.orm.public.User
        .where({
          id: loan.userId,
        })
        .first();

    const bookCopy =
      await db.orm.public.BookCopy
        .where({
          id: loan.bookCopyId,
        })
        .first();

    let book = null;

    if (bookCopy) {
      book =
        await db.orm.public.Book
          .where({
            id: bookCopy.bookId,
          })
          .first();
    }

    const matchesSearch =
      user?.fullName
        ?.toLowerCase()
        .includes(searchTerm) ||

      user?.email
        ?.toLowerCase()
        .includes(searchTerm) ||

      bookCopy?.barcode
        ?.toLowerCase()
        .includes(searchTerm) ||

      book?.title
        ?.toLowerCase()
        .includes(searchTerm) ||

      book?.isbn
        ?.toLowerCase()
        .includes(searchTerm) ||

      book?.author
        ?.toLowerCase()
        .includes(searchTerm);

    if (matchesSearch) {
      searchResults.push(loan);
    }
  }

  filteredLoans = searchResults;
}

// =========================
// SORTING
// =========================
const allowedSortFields = [
  'id',
  'borrowedAt',
  'dueDate',
  'returnedAt',
  'createdAt',
  'updatedAt',
  'status',
];

const selectedSortBy =
  sortBy ?? 'createdAt';

const selectedOrder =
  order?.toLowerCase() ?? 'desc';

if (
  !allowedSortFields.includes(
    selectedSortBy,
  )
) {
  throw new BadRequestException(
    'sortBy tidak valid',
  );
}

if (
  selectedOrder !== 'asc' &&
  selectedOrder !== 'desc'
) {
  throw new BadRequestException(
    'order harus asc atau desc',
  );
}

filteredLoans.sort(
  (a, b) => {
    const valueA =
      a[
        selectedSortBy as keyof typeof a
      ];

    const valueB =
      b[
        selectedSortBy as keyof typeof b
      ];

    if (valueA === valueB) {
      return 0;
    }

    if (valueA === null) {
      return selectedOrder === 'asc'
        ? -1
        : 1;
    }

    if (valueB === null) {
      return selectedOrder === 'asc'
        ? 1
        : -1;
    }

    if (
      typeof valueA === 'number' &&
      typeof valueB === 'number'
    ) {
      return selectedOrder === 'asc'
        ? valueA - valueB
        : valueB - valueA;
    }

    const stringA =
      String(valueA).toLowerCase();

    const stringB =
      String(valueB).toLowerCase();

    const comparison =
      stringA.localeCompare(stringB);

    return selectedOrder === 'asc'
      ? comparison
      : -comparison;
  },
);

    // =========================
    // PAGINATION
    // =========================
    const total =
      filteredLoans.length;

    const totalPages =
      Math.ceil(total / limit);

    const startIndex =
      (page - 1) * limit;

    const endIndex =
      startIndex + limit;

    const paginatedLoans =
      filteredLoans.slice(
        startIndex,
        endIndex,
      );

    const result = [];

    for (
      const loan of paginatedLoans
    ) {
      const user =
        await db.orm.public.User
          .where({
            id: loan.userId,
          })
          .first();

      const bookCopy =
        await db.orm.public.BookCopy
          .where({
            id: loan.bookCopyId,
          })
          .first();

      let book = null;

      if (bookCopy) {
        book =
          await db.orm.public.Book
            .where({
              id: bookCopy.bookId,
            })
            .first();
      }

      result.push({
        id: loan.id,

        user: user
          ? {
              id: user.id,
              fullName:
                user.fullName,
              email:
                user.email,
            }
          : null,

        bookCopy: bookCopy
          ? {
              id: bookCopy.id,
              barcode:
                bookCopy.barcode,

              status:
                bookCopy.status,

              book: book
                ? {
                    id: book.id,
                    title: book.title,
                    isbn: book.isbn,
                    author:
                      book.author,
                  }
                : null,
            }
          : null,

        borrowedAt:
          loan.borrowedAt,

        dueDate:
          loan.dueDate,

        returnedAt:
          loan.returnedAt,

        returnRequestedAt:
          loan.returnRequestedAt,

        returnRequestStatus:
          loan.returnRequestStatus,

        fineAmount:
            loan.fineAmount,

        renewalCount:
          loan.renewalCount,

        status:
          loan.status,

        createdAt:
          loan.createdAt,

        updatedAt:
          loan.updatedAt,
      });
    }

    return {
  data: result,

  pagination: {
    page,
    limit,
    total,
    totalPages,
    },
  };    
  }

  // =========================
  // GET LOAN BY ID
  // =========================
    async findOne(
  id: number,
  requesterUserId: number,
) {

    // Update loan yang terlambat
    await this.updateOverdueLoans();

    const loan =
      await db.orm.public.Loan
        .where({ id })
        .first();

    if (!loan) {
      throw new NotFoundException(
        'Data peminjaman tidak ditemukan',
      );
    }

// =========================
    // CEK ROLE REQUESTER
    // =========================
    const isStaff =
      await this.isLibraryStaff(
        requesterUserId,
      );

    // =========================
    // STUDENT / LECTURER
    // HANYA BOLEH MELIHAT
    // LOAN MILIK SENDIRI
    // =========================
    if (
      !isStaff &&
      loan.userId !== requesterUserId
    ) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses ke peminjaman ini',
      );
    }    

    const user =
      await db.orm.public.User
        .where({
          id: loan.userId,
        })
        .first();

    const bookCopy =
      await db.orm.public.BookCopy
        .where({
          id: loan.bookCopyId,
        })
        .first();

    let book = null;

    if (bookCopy) {
      book =
        await db.orm.public.Book
          .where({
            id: bookCopy.bookId,
          })
          .first();
    }

    return {
      id: loan.id,

      user: user
        ? {
            id: user.id,
            fullName:
              user.fullName,
            email:
              user.email,
          }
        : null,

      bookCopy: bookCopy
        ? {
            id: bookCopy.id,
            barcode:
              bookCopy.barcode,

            status:
              bookCopy.status,

            book: book
              ? {
                  id: book.id,
                  title: book.title,
                  isbn: book.isbn,
                  author:
                    book.author,
                }
              : null,
          }
        : null,

      borrowedAt:
        loan.borrowedAt,

      dueDate:
        loan.dueDate,

      returnedAt:
        loan.returnedAt,

      returnRequestedAt:
        loan.returnRequestedAt,

      returnRequestStatus:
        loan.returnRequestStatus,

      fineAmount:
        loan.fineAmount,

      renewalCount:
        loan.renewalCount,

      status:
        loan.status,

      createdAt:
        loan.createdAt,

      updatedAt:
        loan.updatedAt,
    };
  }
  
// =========================

  // =========================
  // =========================
  // STAFF DIRECT TRANSACTION
  // =========================
  async staffTransaction(
    memberQrToken: string,
    isbn: string,
  ) {
    const normalizedIsbn =
      isbn
        .replace(/[^0-9Xx]/g, '')
        .toUpperCase();

    const qr =
      await this.memberQrService.validateQr(
        memberQrToken,
      );

    if (
      !qr.valid ||
      !qr.member
    ) {
      throw new ForbiddenException(
        'QR anggota tidak valid',
      );
    }

    const books =
      await db.orm.public.Book
        .all();

    const book =
      books.find((item) =>
        item.isbn
          .replace(/[^0-9Xx]/g, '')
          .toUpperCase() ===
        normalizedIsbn,
      );

    if (!book) {
      throw new NotFoundException(
        'Buku dengan ISBN tersebut tidak ditemukan',
      );
    }

    const activeLoans =
      await db.orm.public.Loan
        .where({
          userId:
            qr.member.userId,
        })
        .all();

    const currentLoans =
      activeLoans.filter(
        (loan) =>
          loan.status === 'ACTIVE' ||
          loan.status === 'OVERDUE',
      );

    const maxActiveLoans =
      await this.librarySettingsService.getMaxActiveLoans();

    if (
      currentLoans.length >=
      maxActiveLoans
    ) {
      throw new BadRequestException(
        `Anggota sudah mencapai batas maksimal ${maxActiveLoans} buku yang sedang dipinjam`,
      );
    }

    const copies =
      await db.orm.public.BookCopy
        .where({
          bookId: book.id,
          status: 'AVAILABLE',
        })
        .all();

    if (
      copies.length === 0
    ) {
      throw new BadRequestException(
        'Tidak ada eksemplar buku yang tersedia untuk dipinjam',
      );
    }

    const copy =
      copies.sort(
        (a, b) =>
          a.id - b.id,
      )[0];

    const loanDurationDays =
      await this.librarySettingsService.getLoanDurationDays();

    const dueDate =
      new Date(
        Date.now() +
        loanDurationDays * 24 * 60 * 60 * 1000,
      ).toISOString();

    const result =
      await db.transaction(
        async (tx) => {

          const currentCopy =
            await tx.orm.public.BookCopy
              .where({
                id: copy.id,
              })
              .first();

          if (!currentCopy) {
            throw new NotFoundException(
              'Copy buku tidak ditemukan',
            );
          }

          await tx.orm.public.BookCopy
            .where({
              id: copy.id,
            })
            .update({
              updatedAt:
                currentCopy.updatedAt,
            });

          const lockedCopy =
            await tx.orm.public.BookCopy
              .where({
                id: copy.id,
              })
              .first();

          if (
            !lockedCopy ||
            lockedCopy.status !==
              'AVAILABLE'
          ) {
            throw new BadRequestException(
              'Buku sudah tidak tersedia',
            );
          }

          const loan =
            await tx.orm.public.Loan
              .create({
                userId:
                  qr.member.userId,
                bookCopyId:
                  copy.id,
                borrowedAt:
                  new Date().toISOString(),
                dueDate,
                status:
                  'ACTIVE',
                fineAmount: 0,
                renewalCount: 0,
                returnRequestedAt:
                  null,
                returnRequestStatus:
                  'NONE',
              });

          await tx.orm.public.BookCopy
            .where({
              id: copy.id,
            })
            .update({
              status:
                'BORROWED',
            });

          return {
            loan,
            copy: lockedCopy,
          };
        },
      );

    return {
      message:
        'Peminjaman berhasil dibuat',

      loan:
        result.loan,

      member:
        qr.member,

      book: {
        id:
          book.id,
        title:
          book.title,
        isbn:
          book.isbn,
        author:
          book.author,
      },

      bookCopy: {
        id:
          result.copy.id,
        barcode:
          result.copy.barcode,
        status:
          'BORROWED',
        shelfLocation:
          result.copy.shelfLocation,
        homeLocation:
          result.copy.homeLocation,
      },
    };
  }

  // =========================
  // CANCEL LOAN
  // =========================
  async cancel(
    id: number,
    requesterUserId: number,
  ) {
    const loan =
      await db.orm.public.Loan
        .where({ id })
        .first();

    if (!loan) {
      throw new NotFoundException(
        'Peminjaman tidak ditemukan',
      );
    }

    const isStaff =
      await this.isLibraryStaff(
        requesterUserId,
      );

    if (
      !isStaff &&
      loan.userId !== requesterUserId
    ) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses ke peminjaman ini',
      );
    }

    if (
      loan.status !== 'PENDING'
    ) {
      throw new BadRequestException(
        'Hanya peminjaman PENDING yang dapat dibatalkan',
      );
    }

    const updatedLoan =
      await db.orm.public.Loan
        .where({ id })
        .update({
          status:
            'CANCELLED',
        });

    return {
      message:
        'Peminjaman berhasil dibatalkan',
      loan:
        updatedLoan,
    };
  }

  // =========================
  // REJECT LOAN
  // =========================
  async reject(
    id: number,
  ) {
    const loan =
      await db.orm.public.Loan
        .where({ id })
        .first();

    if (!loan) {
      throw new NotFoundException(
        'Peminjaman tidak ditemukan',
      );
    }

    if (
      loan.status !== 'PENDING'
    ) {
      throw new BadRequestException(
        'Hanya peminjaman PENDING yang dapat ditolak',
      );
    }

    const updatedLoan =
      await db.orm.public.Loan
        .where({ id })
        .update({
          status:
            'REJECTED',
        });

    return {
      message:
        'Peminjaman berhasil ditolak',
      loan:
        updatedLoan,
    };
  }

  // =========================
  // LOAN STATISTICS
  // =========================
  async getStatistics() {
    const loans =
      await db.orm.public.Loan
        .all();

    const statistics = {
      total:
        loans.length,
      pending: 0,
      active: 0,
      overdue: 0,
      returned: 0,
      cancelled: 0,
      rejected: 0,
    };

    for (
      const loan of loans
    ) {
      switch (
        loan.status
      ) {
        case 'PENDING':
          statistics.pending++;
          break;

        case 'ACTIVE':
          statistics.active++;
          break;

        case 'OVERDUE':
          statistics.overdue++;
          break;

        case 'RETURNED':
          statistics.returned++;
          break;

        case 'CANCELLED':
          statistics.cancelled++;
          break;

        case 'REJECTED':
          statistics.rejected++;
          break;
      }
    }

    return statistics;
  }

  // =========================
  // MARK AS LOST
  // =========================
  async markAsLost(
    id: number,
  ) {
    const result =
      await db.transaction(
        async (tx) => {

          const loan =
            await tx.orm.public.Loan
              .where({ id })
              .first();

          if (!loan) {
            throw new NotFoundException(
              'Peminjaman tidak ditemukan',
            );
          }

          if (
            loan.status !== 'ACTIVE' &&
            loan.status !== 'OVERDUE'
          ) {
            throw new BadRequestException(
              'Buku hanya dapat ditandai hilang saat sedang dipinjam',
            );
          }

          await tx.orm.public.Loan
            .where({ id })
            .update({
              updatedAt:
                loan.updatedAt,
            });

          const lockedLoan =
            await tx.orm.public.Loan
              .where({ id })
              .first();

          if (!lockedLoan) {
            throw new NotFoundException(
              'Peminjaman tidak ditemukan',
            );
          }

          const now =
            new Date();

          const updatedLoan =
            await tx.orm.public.Loan
              .where({ id })
              .update({
                status:
                  'RETURNED',
                returnedAt:
                  now.toISOString(),
                returnRequestStatus:
                  lockedLoan.returnRequestStatus ===
                  'REQUESTED'
                    ? 'COMPLETED'
                    : lockedLoan.returnRequestStatus,
              });

          const copy =
            await tx.orm.public.BookCopy
              .where({
                id:
                  lockedLoan.bookCopyId,
              })
              .first();

          if (!copy) {
            throw new NotFoundException(
              'Copy buku tidak ditemukan',
            );
          }

          await tx.orm.public.BookCopy
            .where({
              id:
                lockedLoan.bookCopyId,
            })
            .update({
              updatedAt:
                copy.updatedAt,
            });

          await tx.orm.public.BookCopy
            .where({
              id:
                lockedLoan.bookCopyId,
            })
            .update({
              status:
                'LOST',
            });

          return updatedLoan;
        },
      );

    return {
      message:
        'Buku berhasil ditandai sebagai hilang',
      loan:
        result,
    };
  }

  // =========================
  // MARK AS DAMAGED
  // =========================
  async markAsDamaged(
    id: number,
  ) {
    const result =
      await db.transaction(
        async (tx) => {

          const loan =
            await tx.orm.public.Loan
              .where({ id })
              .first();

          if (!loan) {
            throw new NotFoundException(
              'Peminjaman tidak ditemukan',
            );
          }

          if (
            loan.status !== 'ACTIVE' &&
            loan.status !== 'OVERDUE'
          ) {
            throw new BadRequestException(
              'Buku hanya dapat ditandai rusak saat sedang dipinjam',
            );
          }

          await tx.orm.public.Loan
            .where({ id })
            .update({
              updatedAt:
                loan.updatedAt,
            });

          const lockedLoan =
            await tx.orm.public.Loan
              .where({ id })
              .first();

          if (!lockedLoan) {
            throw new NotFoundException(
              'Peminjaman tidak ditemukan',
            );
          }

          const now =
            new Date();

          const updatedLoan =
            await tx.orm.public.Loan
              .where({ id })
              .update({
                status:
                  'RETURNED',
                returnedAt:
                  now.toISOString(),
                returnRequestStatus:
                  lockedLoan.returnRequestStatus ===
                  'REQUESTED'
                    ? 'COMPLETED'
                    : lockedLoan.returnRequestStatus,
              });

          const copy =
            await tx.orm.public.BookCopy
              .where({
                id:
                  lockedLoan.bookCopyId,
              })
              .first();

          if (!copy) {
            throw new NotFoundException(
              'Copy buku tidak ditemukan',
            );
          }

          await tx.orm.public.BookCopy
            .where({
              id:
                lockedLoan.bookCopyId,
            })
            .update({
              updatedAt:
                copy.updatedAt,
            });

          await tx.orm.public.BookCopy
            .where({
              id:
                lockedLoan.bookCopyId,
            })
            .update({
              status:
                'DAMAGED',
            });

          return updatedLoan;
        },
      );

    return {
      message:
        'Buku berhasil ditandai sebagai rusak',
      loan:
        result,
    };
  }

  // RENEW LOAN
  // =========================
  async renew(
    id: number,
    requesterUserId: number,
  ) {
    const result =
      await db.transaction(async (tx) => {

        // =========================
        // CARI LOAN
        // =========================
        const loan =
          await tx.orm.public.Loan
            .where({ id })
            .first();

        if (!loan) {
          throw new NotFoundException(
            'Data peminjaman tidak ditemukan',
          );
        }

        // =========================
        // CEK KEPEMILIKAN
        // =========================
        const isStaff =
          await this.isLibraryStaff(
            requesterUserId,
          );

        if (
          !isStaff &&
          loan.userId !== requesterUserId
        ) {
          throw new ForbiddenException(
            'Anda tidak dapat memperpanjang peminjaman orang lain',
          );
        }

        // =========================
        // LOCK LOAN
        // =========================
        await tx.orm.public.Loan
          .where({ id })
          .update({
            updatedAt: loan.updatedAt,
          });

        // =========================
        // BACA ULANG LOAN
        // =========================
        const lockedLoan =
          await tx.orm.public.Loan
            .where({ id })
            .first();

        if (!lockedLoan) {
          throw new NotFoundException(
            'Data peminjaman tidak ditemukan',
          );
        }

        // =========================
        // CEK STATUS
        // =========================
        if (
          lockedLoan.status !== 'ACTIVE'
        ) {
          throw new BadRequestException(
            'Hanya peminjaman ACTIVE yang dapat diperpanjang',
          );
        }

        // =========================
        // BATAS RENEWAL
        // =========================
        const maxRenewals =
          await this.librarySettingsService.getMaxRenewals();

        if (
          lockedLoan.renewalCount >=
          maxRenewals
        ) {
          throw new BadRequestException(
            `Maksimal peminjaman dapat diperpanjang ${maxRenewals} kali`,
          );
        }

        // =========================
        // CEK RESERVATION CONFLICT
        // =========================
        const bookCopy =
          await tx.orm.public.BookCopy
            .where({
              id: lockedLoan.bookCopyId,
            })
            .first();

        if (!bookCopy) {
          throw new NotFoundException(
            'Copy buku dari peminjaman tidak ditemukan',
          );
        }

        const reservations =
          await tx.orm.public.Reservation
            .where({
              bookId: bookCopy.bookId,
            })
            .all();

        const now =
          new Date();

        const conflictingReservation =
          reservations.find(
            (reservation) => {
              if (
                reservation.userId ===
                lockedLoan.userId
              ) {
                return false;
              }

              if (
                reservation.status ===
                  'PENDING' ||
                reservation.status ===
                  'APPROVED'
              ) {
                return true;
              }

              if (
                reservation.status ===
                'READY_FOR_PICKUP'
              ) {
                return (
                  reservation.expiresAt !==
                    null &&
                  new Date(
                    reservation.expiresAt,
                  ).getTime() >
                    now.getTime()
                );
              }

              return false;
            },
          );

        if (conflictingReservation) {
          throw new BadRequestException(
            'Peminjaman tidak dapat diperpanjang karena buku sudah memiliki reservation aktif dari pengguna lain',
          );
        }

        // =========================
        // HITUNG DUE DATE BARU
        // =========================
        const currentDueDate =
          new Date(
            lockedLoan.dueDate,
          );

        const renewalDurationDays =
          await this.librarySettingsService.getRenewalDurationDays();

        const newDueDate =
          new Date(currentDueDate);

        newDueDate.setDate(
          newDueDate.getDate() + renewalDurationDays,
        );

        const updatedAt =
          new Date().toISOString();

        // =========================
        // UPDATE LOAN
        // =========================
        const updatedLoan =
          await tx.orm.public.Loan
            .where({ id })
            .update({
              dueDate:
                newDueDate.toISOString(),

              renewalCount:
                lockedLoan.renewalCount + 1,

              updatedAt,
            });

        if (!updatedLoan) {
          throw new NotFoundException(
            'Data peminjaman gagal diperbarui',
          );
        }

        return {
          updatedLoan,
          newDueDate,
        };
      });

    // =========================
    // AUDIT LOG
    // =========================
    await this.auditLogService.create({
      userId: requesterUserId,
      action: 'LOAN_RENEWED',
      entity: 'Loan',
      entityId: result.updatedLoan.id,
      description: `Peminjaman #${result.updatedLoan.id} diperpanjang`,
      details: `Due date baru: ${result.newDueDate.toISOString()} | Renewal ke-${result.updatedLoan.renewalCount}`,
    });

    // =========================
    // RESPONSE
    // =========================
    return {
      message:
        'Peminjaman berhasil diperpanjang',

      loan: {
        id:
          result.updatedLoan.id,

        dueDate:
          result.updatedLoan.dueDate,

        renewalCount:
          result.updatedLoan.renewalCount,

        status:
          result.updatedLoan.status,
      },
    };
  }

  // =========================
  // APPROVE LOAN
  // =========================
  async approve(id: number) {
    const result =
      await db.transaction(async (tx) => {

        // =========================
        // CARI LOAN
        // =========================
        const loan =
          await tx.orm.public.Loan
            .where({ id })
            .first();

        if (!loan) {
          throw new NotFoundException(
            'Data peminjaman tidak ditemukan',
          );
        }

        // =========================
        // LOCK LOAN
        // =========================
        await tx.orm.public.Loan
          .where({ id })
          .update({
            updatedAt: loan.updatedAt,
          });

        // =========================
        // CEK STATUS LOAN
        // =========================
        if (loan.status !== 'PENDING') {
          throw new BadRequestException(
            'Peminjaman tidak dapat disetujui',
          );
        }

        // =========================
        // CARI BOOK COPY
        // =========================
        const bookCopy =
          await tx.orm.public.BookCopy
            .where({
              id: loan.bookCopyId,
            })
            .first();

        if (!bookCopy) {
          throw new NotFoundException(
            'Copy buku tidak ditemukan',
          );
        }

        // =========================
        // LOCK BOOK COPY
        // =========================
        await tx.orm.public.BookCopy
          .where({
            id: loan.bookCopyId,
          })
          .update({
            updatedAt:
              bookCopy.updatedAt,
          });

        // =========================
        // CEK STATUS BUKU
        // =========================
        if (
          bookCopy.status !==
          'AVAILABLE'
        ) {
          throw new BadRequestException(
            'Buku sudah tidak tersedia',
          );
        }

        // =========================
        // UPDATE LOAN
        // =========================
        const updatedLoan =
        await tx.orm.public.Loan
        .where({
        id,
        status: 'PENDING',
        })
        .update({
        status: 'ACTIVE',
        updatedAt:
        new Date().toISOString(),
        });

        if (!updatedLoan) {
          throw new BadRequestException(
           'Hanya peminjaman PENDING yang dapat dibatalkan',
                );
        }

        // =========================
        // UPDATE BOOK COPY
        // =========================
        const updatedBookCopy =
          await tx.orm.public.BookCopy
            .where({
              id: loan.bookCopyId,
            })
            .update({
              status: 'BORROWED',
            });

        if (!updatedBookCopy) {
          throw new NotFoundException(
            'Copy buku gagal diperbarui',
          );
        }

        return {
          updatedLoan,
          updatedBookCopy,
        };
      });

    // =========================
    // RESPONSE
    // =========================
    return {
      message:
        'Peminjaman berhasil disetujui',

      loan: {
        id:
          result.updatedLoan.id,

        status:
          result.updatedLoan.status,

        bookCopy: {
          id:
            result.updatedBookCopy.id,

          barcode:
            result.updatedBookCopy.barcode,

          status:
            result.updatedBookCopy.status,
        },
      },
    };
  }

 // =========================
// REQUEST RETURN
// =========================
async requestReturn(
  id: number,
  userId: number,
) {
  const loan =
    await db.orm.public.Loan
      .where({ id })
      .first();

  if (!loan) {
    throw new NotFoundException(
      'Data peminjaman tidak ditemukan',
    );
  }

  if (loan.userId !== userId) {
    throw new BadRequestException(
      'Anda tidak memiliki akses ke peminjaman ini',
    );
  }

  if (
    loan.status !== 'ACTIVE' &&
    loan.status !== 'OVERDUE'
  ) {
    throw new BadRequestException(
      'Peminjaman ini tidak dapat diajukan untuk pengembalian',
    );
  }

  if (
    loan.returnRequestStatus === 'REQUESTED'
  ) {
    throw new BadRequestException(
      'Pengajuan pengembalian sudah dibuat',
    );
  }

  const returnRequestedAt =
    new Date().toISOString();

  const updatedLoan =
    await db.orm.public.Loan
      .where({ id })
      .update({
        returnRequestedAt,
        returnRequestStatus: 'REQUESTED',
        updatedAt: returnRequestedAt,
      });

  if (!updatedLoan) {
    throw new NotFoundException(
      'Pengajuan pengembalian gagal dibuat',
    );
  }

  return {
    message:
      'Pengajuan pengembalian berhasil dibuat. Silakan membawa buku ke perpustakaan pada jam operasional untuk menyelesaikan pengembalian.',
    loan: {
      id: updatedLoan.id,
      status: updatedLoan.status,
      returnRequestStatus:
        updatedLoan.returnRequestStatus,
      returnRequestedAt:
        updatedLoan.returnRequestedAt,
      dueDate: updatedLoan.dueDate,
    },
  };
}

// =========================
// RETURN BOOK
// =========================
async returnBook(id: number) {
  const result =
    await db.transaction(async (tx) => {

      // =========================
      // CARI LOAN
      // =========================
      const loan =
        await tx.orm.public.Loan
          .where({ id })
          .first();

      if (!loan) {
        throw new NotFoundException(
          'Data peminjaman tidak ditemukan',
        );
      }

      // =========================
      // LOCK LOAN
      // =========================
      await tx.orm.public.Loan
        .where({ id })
        .update({
          updatedAt: loan.updatedAt,
        });

      // =========================
      // BACA ULANG LOAN
      // =========================
      const lockedLoan =
        await tx.orm.public.Loan
          .where({ id })
          .first();

      if (!lockedLoan) {
        throw new NotFoundException(
          'Data peminjaman tidak ditemukan',
        );
      }

      // =========================
      // CEK STATUS
      // =========================
      if (
        lockedLoan.status !== 'ACTIVE' &&
        lockedLoan.status !== 'OVERDUE'
      ) {
        throw new BadRequestException(
          'Buku tidak dapat dikembalikan',
        );
      }

      // =========================
      // CARI BOOK COPY
      // =========================
      const bookCopy =
        await tx.orm.public.BookCopy
          .where({
            id: lockedLoan.bookCopyId,
          })
          .first();

      if (!bookCopy) {
        throw new NotFoundException(
          'Copy buku tidak ditemukan',
        );
      }

      // =========================
      // LOCK BOOK COPY
      // =========================
      await tx.orm.public.BookCopy
        .where({
          id: lockedLoan.bookCopyId,
        })
        .update({
          updatedAt: bookCopy.updatedAt,
        });

      // =========================
      // WAKTU PENGEMBALIAN
      // =========================
      const returnedAt =
        new Date().toISOString();

      // =========================
      // HITUNG DENDA
      // =========================
      const dueDate =
        new Date(lockedLoan.dueDate);

      const returnedDate =
        new Date(returnedAt);

      const dueDateDay = new Date(
        dueDate.getFullYear(),
        dueDate.getMonth(),
        dueDate.getDate(),
      );

      const returnedDateDay = new Date(
        returnedDate.getFullYear(),
        returnedDate.getMonth(),
        returnedDate.getDate(),
      );

      const overdueDays =
        Math.max(
          Math.floor(
            (returnedDateDay.getTime() -
              dueDateDay.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
          0,
        );

      const finePerDay =
        await this.librarySettingsService.getFinePerDay();

      const fineAmount =
        overdueDays * finePerDay;

      // =========================
      // UPDATE LOAN
      // =========================
      const updatedLoan =
        await tx.orm.public.Loan
          .where({ id })
          .update({
            status: 'RETURNED',
            returnedAt,
            fineAmount,
            updatedAt: returnedAt,
          });

      if (!updatedLoan) {
        throw new NotFoundException(
          'Data peminjaman gagal diperbarui',
        );
      }

      // =========================
      // UPDATE BOOK COPY
      // =========================
      const updatedBookCopy =
        await tx.orm.public.BookCopy
          .where({
            id: lockedLoan.bookCopyId,
          })
          .update({
            status: 'AVAILABLE',
            updatedAt: returnedAt,
          });

      if (!updatedBookCopy) {
        throw new NotFoundException(
          'Copy buku gagal diperbarui',
        );
      }

      return {
        updatedLoan,
        updatedBookCopy,
      };
    });

  // =========================
  // PROMOTE RESERVATION
  // =========================
  if (
    result.updatedBookCopy.status ===
    'AVAILABLE'
  ) {
    const bookCopy =
      await db.orm.public.BookCopy
        .where({
          id: result.updatedBookCopy.id,
        })
        .first();

    if (bookCopy) {
      await this.reservationsService
        .promoteNextReservation(
          bookCopy.bookId,
        );
    }
  }

  // =========================
  // AUDIT LOG
  // =========================
  await this.auditLogService.create({
    userId: result.updatedLoan.userId,
    action: 'LOAN_RETURNED',
    entity: 'Loan',
    entityId: result.updatedLoan.id,
    description: `Peminjaman #${result.updatedLoan.id} dikembalikan`,
    details: `Copy: ${result.updatedBookCopy.id} | Denda: ${result.updatedLoan.fineAmount}`,
  });

  // =========================
  // RESPONSE
  // =========================
  return {
    message:
      'Buku berhasil dikembalikan', 

    loan: {
      id:
        result.updatedLoan.id,

      status:
        result.updatedLoan.status,

      returnedAt:
        result.updatedLoan.returnedAt,

      fineAmount:
        result.updatedLoan.fineAmount,

      bookCopy: {
        id:
          result.updatedBookCopy.id,

        barcode:
          result.updatedBookCopy.barcode,

        status:
          result.updatedBookCopy.status,
      },
    },
  };
}


// =========================
// STAFF RETURN PREVIEW
// =========================
async staffReturnPreview(
  memberQrToken: string,
  isbn: string,
  loanId?: number,
) {
  const normalizedIsbn =
    isbn.replace(/\D/g, '');

  if (!normalizedIsbn) {
    throw new BadRequestException(
      'ISBN buku tidak valid',
    );
  }

  const qr =
    await this.memberQrService.validateQr(
      memberQrToken.trim(),
    );

  const userId =
    qr.member.userId;

  const books =
    await db.orm.public.Book.all();

  const book =
    books.find(
      (item) =>
        String(item.isbn ?? '')
          .replace(/\D/g, '') ===
        normalizedIsbn,
    );

  if (!book) {
    throw new NotFoundException(
      'ISBN buku tidak ditemukan',
    );
  }

  const copies =
    await db.orm.public.BookCopy
      .where({
        bookId: book.id,
      })
      .all();

  const copyIds =
    copies.map(
      (copy) => copy.id,
    );

  if (!copyIds.length) {
    throw new NotFoundException(
      'Tidak ada eksemplar untuk buku ini',
    );
  }

  let activeLoan;

  if (loanId !== undefined) {
    const requestedLoan =
      await db.orm.public.Loan
        .where({
          id: loanId,
        })
        .first();

    if (!requestedLoan) {
      throw new NotFoundException(
        'Data peminjaman tidak ditemukan',
      );
    }

    if (
      requestedLoan.userId !== userId
    ) {
      throw new BadRequestException(
        'Peminjaman bukan milik anggota yang dipindai',
      );
    }

    if (
      requestedLoan.status !== 'ACTIVE' &&
      requestedLoan.status !== 'OVERDUE'
    ) {
      throw new BadRequestException(
        'Peminjaman ini sudah tidak aktif',
      );
    }

    if (
      !copyIds.includes(
        requestedLoan.bookCopyId,
      )
    ) {
      throw new BadRequestException(
        'ISBN tidak sesuai dengan peminjaman yang dipilih',
      );
    }

    activeLoan = requestedLoan;
  } else {
    const userLoans =
      await db.orm.public.Loan
        .where({
          userId,
        })
        .all();

    const matchingLoans = [];

    for (const loan of userLoans) {
      if (
        loan.status !== 'ACTIVE' &&
        loan.status !== 'OVERDUE'
      ) {
        continue;
      }

      if (
        copyIds.includes(
          loan.bookCopyId,
        )
      ) {
        matchingLoans.push(loan);
      }
    }

    if (matchingLoans.length === 0) {
      throw new NotFoundException(
        'Peminjaman aktif untuk anggota dan ISBN ini tidak ditemukan',
      );
    }

    if (matchingLoans.length > 1) {
      throw new BadRequestException(
        'Anggota memiliki lebih dari satu peminjaman untuk ISBN ini. Silakan proses secara khusus.',
      );
    }

    activeLoan =
      matchingLoans[0];
  }

  const bookCopy =
    copies.find(
      (copy) =>
        copy.id ===
        activeLoan.bookCopyId,
    );

  if (!bookCopy) {
    throw new NotFoundException(
      'Eksemplar buku tidak ditemukan',
    );
  }

  return {
    loan: {
      id: activeLoan.id,
      status: activeLoan.status,
      borrowedAt:
        activeLoan.borrowedAt,
      dueDate:
        activeLoan.dueDate,
      returnRequestStatus:
        activeLoan.returnRequestStatus,
      returnRequestedAt:
        activeLoan.returnRequestedAt,
    },

    member: {
      id: qr.member.userId,
      fullName:
        qr.member.fullName,
      email:
        qr.member.email,
    },

    book: {
      id: book.id,
      title: book.title,
      isbn: book.isbn,
    },

    bookCopy: {
      id: bookCopy.id,
      status: bookCopy.status,
      homeLocation:
        bookCopy.homeLocation,
      shelfLocation:
        bookCopy.shelfLocation,
    },
  };
}


// =========================
// STAFF RETURN TRANSACTION
// =========================
async staffReturnTransaction(
  memberQrToken: string,
  isbn: string,
  condition: string,
  shelfConfirmed: boolean,
  loanId?: number,
) {
  if (
    condition !== 'GOOD' &&
    condition !== 'DAMAGED' &&
    condition !== 'LOST'
  ) {
    throw new BadRequestException(
      'Kondisi buku tidak valid',
    );
  }

  if (
    condition === 'GOOD' &&
    !shelfConfirmed
  ) {
    throw new BadRequestException(
      'Buku harus dikonfirmasi sudah ditaruh di rak',
    );
  }

  const normalizedIsbn =
    isbn.replace(/\D/g, '');

  if (!normalizedIsbn) {
    throw new BadRequestException(
      'ISBN buku tidak valid',
    );
  }

  const qr =
    await this.memberQrService.validateQr(
      memberQrToken.trim(),
    );

  const userId =
    qr.member.userId;

  const result =
    await db.transaction(async (tx) => {
      const books =
        await tx.orm.public.Book.all();

      const book =
        books.find(
          (item) =>
            String(item.isbn ?? '')
              .replace(/\D/g, '') ===
            normalizedIsbn,
        );

      if (!book) {
        throw new NotFoundException(
          'ISBN buku tidak ditemukan',
        );
      }

      const copies =
        await tx.orm.public.BookCopy
          .where({
            bookId: book.id,
          })
          .all();

      const copyIds =
        copies.map(
          (copy) => copy.id,
        );

      let loan;

      if (loanId !== undefined) {
        const requestedLoan =
          await tx.orm.public.Loan
            .where({
              id: loanId,
            })
            .first();

        if (!requestedLoan) {
          throw new NotFoundException(
            'Data peminjaman tidak ditemukan',
          );
        }

        if (
          requestedLoan.userId !== userId
        ) {
          throw new BadRequestException(
            'Peminjaman bukan milik anggota yang dipindai',
          );
        }

        if (
          requestedLoan.status !== 'ACTIVE' &&
          requestedLoan.status !== 'OVERDUE'
        ) {
          throw new BadRequestException(
            'Peminjaman ini sudah tidak aktif',
          );
        }

        if (
          !copyIds.includes(
            requestedLoan.bookCopyId,
          )
        ) {
          throw new BadRequestException(
            'ISBN tidak sesuai dengan peminjaman yang dipilih',
          );
        }

        loan = requestedLoan;
      } else {
        const userLoans =
          await tx.orm.public.Loan
            .where({
              userId,
            })
            .all();

        const matchingLoans = [];

        for (const loanItem of userLoans) {
          if (
            loanItem.status !== 'ACTIVE' &&
            loanItem.status !== 'OVERDUE'
          ) {
            continue;
          }

          if (
            copyIds.includes(
              loanItem.bookCopyId,
            )
          ) {
            matchingLoans.push(
              loanItem,
            );
          }
        }

        if (matchingLoans.length === 0) {
          throw new NotFoundException(
            'Peminjaman aktif untuk anggota dan ISBN ini tidak ditemukan',
          );
        }

        if (matchingLoans.length > 1) {
          throw new BadRequestException(
            'Anggota memiliki lebih dari satu peminjaman untuk ISBN ini. Silakan proses secara khusus.',
          );
        }

        loan =
          matchingLoans[0];
      }

      await tx.orm.public.Loan
        .where({
          id: loan.id,
        })
        .update({
          updatedAt:
            loan.updatedAt,
        });

      const lockedLoan =
        await tx.orm.public.Loan
          .where({
            id: loan.id,
          })
          .first();

      if (!lockedLoan) {
        throw new NotFoundException(
          'Data peminjaman tidak ditemukan',
        );
      }

      if (
        lockedLoan.status !== 'ACTIVE' &&
        lockedLoan.status !== 'OVERDUE'
      ) {
        throw new BadRequestException(
          'Peminjaman ini sudah diproses',
        );
      }

      const bookCopy =
        copies.find(
          (copy) =>
            copy.id ===
            lockedLoan.bookCopyId,
        );

      if (!bookCopy) {
        throw new NotFoundException(
          'Eksemplar buku tidak ditemukan',
        );
      }

      await tx.orm.public.BookCopy
        .where({
          id: bookCopy.id,
        })
        .update({
          updatedAt:
            bookCopy.updatedAt,
        });

      const lockedBookCopy =
        await tx.orm.public.BookCopy
          .where({
            id: bookCopy.id,
          })
          .first();

      if (!lockedBookCopy) {
        throw new NotFoundException(
          'Eksemplar buku tidak ditemukan',
        );
      }

      if (
        lockedBookCopy.status !==
        'BORROWED'
      ) {
        throw new BadRequestException(
          'Eksemplar buku ini tidak sedang dipinjam',
        );
      }

      const returnedAt =
        new Date().toISOString();

      const dueDate =
        new Date(
          lockedLoan.dueDate,
        );

      const returnedDate =
        new Date(returnedAt);

      const dueDateDay =
        new Date(
          dueDate.getFullYear(),
          dueDate.getMonth(),
          dueDate.getDate(),
        );

      const returnedDateDay =
        new Date(
          returnedDate.getFullYear(),
          returnedDate.getMonth(),
          returnedDate.getDate(),
        );

      const overdueDays =
        Math.max(
          Math.floor(
            (
              returnedDateDay.getTime() -
              dueDateDay.getTime()
            ) /
            (1000 * 60 * 60 * 24),
          ),
          0,
        );

      const finePerDay =
        await this.librarySettingsService.getFinePerDay();

      const fineAmount =
        overdueDays * finePerDay;

      const copyStatus =
        condition === 'GOOD'
          ? 'AVAILABLE'
          : condition;

      const updatedLoan =
        await tx.orm.public.Loan
          .where({
            id: lockedLoan.id,
          })
          .update({
            status: 'RETURNED',
            returnedAt,
            fineAmount,
            returnRequestStatus:
              lockedLoan.returnRequestStatus ===
              'REQUESTED'
                ? 'COMPLETED'
                : lockedLoan.returnRequestStatus,
            updatedAt:
              returnedAt,
          });

      if (!updatedLoan) {
        throw new NotFoundException(
          'Data peminjaman gagal diperbarui',
        );
      }

      const updatedBookCopy =
        await tx.orm.public.BookCopy
          .where({
            id: lockedBookCopy.id,
          })
          .update({
            status: copyStatus,
            ...(condition === 'GOOD'
              ? {
                  shelfLocation:
                    lockedBookCopy.homeLocation ??
                    lockedBookCopy.shelfLocation,
                }
              : {}),
            updatedAt:
              returnedAt,
          });

      if (!updatedBookCopy) {
        throw new NotFoundException(
          'Eksemplar buku gagal diperbarui',
        );
      }

      return {
        message:
          'Pengembalian buku berhasil diproses',
        loan: {
          id: lockedLoan.id,
          status: 'RETURNED',
          returnedAt,
          fineAmount,
          returnRequestStatus:
            lockedLoan.returnRequestStatus ===
            'REQUESTED'
              ? 'COMPLETED'
              : lockedLoan.returnRequestStatus,
        },
        book: {
          id: book.id,
          title: book.title,
          isbn: book.isbn,
        },
        bookCopy: {
          id: lockedBookCopy.id,
          status: copyStatus,
          homeLocation:
            lockedBookCopy.homeLocation,
          shelfLocation:
            condition === 'GOOD'
              ? lockedBookCopy.homeLocation ??
                lockedBookCopy.shelfLocation
              : lockedBookCopy.shelfLocation,
        },
      };
    });

  if (
    result.bookCopy.status === 'AVAILABLE'
  ) {
    await this.reservationsService
      .promoteNextReservation(
        result.book.id,
      );
  }

  // =========================
  // AUDIT LOG
  // =========================
  await this.auditLogService.create({
    userId,
    action: 'LOAN_RETURNED',
    entity: 'Loan',
    entityId: result.loan.id,
    description: `Peminjaman #${result.loan.id} dikembalikan`,
    details: `ISBN: ${result.book.isbn} | Kondisi: ${condition} | Status copy: ${result.bookCopy.status} | Denda: ${result.loan.fineAmount}`,
  });

  return result;
}
}
