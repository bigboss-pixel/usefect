import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { db } from '../prisma/db.js';

import { CreateBookCopyDto } from './dto/create-book-copy.dto.js';
import { CreateManyBookCopiesDto } from './dto/create-many-book-copies.dto.js';
import { UpdateBookCopyDto } from './dto/update-book-copy.dto.js';

@Injectable()
export class BookCopiesService {
  // =========================
  // CREATE BOOK COPY
  // =========================
  async create(
    createBookCopyDto: CreateBookCopyDto,
  ) {
    const {
      barcode,
      bookId,
      shelfLocation,
      status,
    } = createBookCopyDto;

    // Cek barcode
    const existingBookCopy =
      await db.orm.public.BookCopy
        .where({ barcode })
        .first();

    if (existingBookCopy) {
      throw new BadRequestException(
        'Barcode sudah digunakan',
      );
    }

    // Cek buku
    const book =
      await db.orm.public.Book
        .where({ id: bookId })
        .first();

    if (!book) {
      throw new NotFoundException(
        'Buku tidak ditemukan',
      );
    }

    // Buat copy buku
    const bookCopy =
      await db.orm.public.BookCopy
        .create({
          barcode,
          bookId,

          shelfLocation:
            shelfLocation ?? null,

          // Lokasi asal/default buku
          homeLocation:
            shelfLocation ?? null,

          status:
            status ?? 'AVAILABLE',
        });

    return {
      message:
        'Copy buku berhasil dibuat',

      bookCopy: {
        id: bookCopy.id,
        barcode: bookCopy.barcode,
        bookId: bookCopy.bookId,

        shelfLocation:
          bookCopy.shelfLocation,

        homeLocation:
          bookCopy.homeLocation,

        status:
          bookCopy.status,

        book: {
          id: book.id,
          title: book.title,
          isbn: book.isbn,
          author: book.author,
        },

        createdAt:
          bookCopy.createdAt,

        updatedAt:
          bookCopy.updatedAt,
      },
    };
  }

  // =========================
  // CREATE MANY BOOK COPIES
  // =========================
  async createMany(
    bookId: number,
    createManyBookCopiesDto: CreateManyBookCopiesDto,
  ) {
    const {
      quantity,
    } = createManyBookCopiesDto;

    // Cek buku
    const book =
      await db.orm.public.Book
        .where({ id: bookId })
        .first();

    if (!book) {
      throw new NotFoundException(
        'Buku tidak ditemukan',
      );
    }

    // Ambil semua copy dari buku ini
    const existingCopies =
      await db.orm.public.BookCopy
        .where({ bookId })
        .all();

    // =========================
    // TENTUKAN LOKASI RAK OTOMATIS
    // =========================
    //
    // Sistem mencari rak yang paling banyak
    // digunakan oleh eksemplar buku ini.
    //
    // Jika ada beberapa rak dengan jumlah yang
    // sama, pilih rak dari eksemplar terbaru.
    let automaticShelfLocation:
      string | null = null;

    const shelfCounts =
      new Map<string, number>();

    for (const copy of existingCopies) {
      if (!copy.shelfLocation) {
        continue;
      }

      const location =
        copy.shelfLocation.trim();

      if (!location) {
        continue;
      }

      shelfCounts.set(
        location,
        (shelfCounts.get(location) ?? 0) + 1,
      );
    }

    if (shelfCounts.size > 0) {
      let highestCount = 0;

      for (const [
        location,
        count,
      ] of shelfCounts.entries()) {
        if (count > highestCount) {
          highestCount = count;
          automaticShelfLocation =
            location;
        }
      }

      // Jika jumlah rak seri, gunakan lokasi
      // dari eksemplar terbaru.
      const maxCount =
        Math.max(
          ...shelfCounts.values(),
        );

      const tiedLocations =
        new Set(
          Array.from(
            shelfCounts.entries(),
          )
            .filter(
              ([, count]) =>
                count === maxCount,
            )
            .map(
              ([location]) =>
                location,
            ),
        );

      if (tiedLocations.size > 1) {
        for (
          let index =
            existingCopies.length - 1;
          index >= 0;
          index--
        ) {
          const location =
            existingCopies[index]
              .shelfLocation
              ?.trim();

          if (
            location &&
            tiedLocations.has(location)
          ) {
            automaticShelfLocation =
              location;
            break;
          }
        }
      }
    }

    // =========================
    // BARCODE OTOMATIS
    // =========================
    //
    // Contoh:
    // UMA-BOOK-0005-001
    //
    const prefix =
      `UMA-BOOK-${String(bookId).padStart(4, '0')}-`;

    // Cari sequence terbesar
    let maxSequence = 0;

    for (const copy of existingCopies) {
      if (
        !copy.barcode.startsWith(prefix)
      ) {
        continue;
      }

      const suffix =
        copy.barcode.slice(
          prefix.length,
        );

      if (!/^\d+$/.test(suffix)) {
        continue;
      }

      const sequence =
        Number.parseInt(
          suffix,
          10,
        );

      if (
        Number.isInteger(sequence) &&
        sequence > maxSequence
      ) {
        maxSequence = sequence;
      }
    }

    const createdCopies = [];

    // =========================
    // BUAT COPY
    // =========================
    for (
      let index = 1;
      index <= quantity;
      index++
    ) {
      const sequence =
        maxSequence + index;

      const barcode =
        `${prefix}${String(sequence).padStart(3, '0')}`;

      const bookCopy =
        await db.orm.public.BookCopy
          .create({
            barcode,
            bookId,

            shelfLocation:
              automaticShelfLocation,

            // Lokasi asal sama dengan
            // lokasi rak awal
            homeLocation:
              automaticShelfLocation,

            status:
              'AVAILABLE',
          });

      createdCopies.push({
        id: bookCopy.id,

        barcode:
          bookCopy.barcode,

        bookId:
          bookCopy.bookId,

        shelfLocation:
          bookCopy.shelfLocation,

        homeLocation:
          bookCopy.homeLocation,

        status:
          bookCopy.status,

        createdAt:
          bookCopy.createdAt,

        updatedAt:
          bookCopy.updatedAt,
      });
    }

    return {
      message:
        `${createdCopies.length} eksemplar berhasil ditambahkan`,

      book: {
        id: book.id,
        title: book.title,
        isbn: book.isbn,
        author: book.author,
      },

      shelfLocation:
        automaticShelfLocation,

      totalCreated:
        createdCopies.length,

      bookCopies:
        createdCopies,
    };
  }

  // =========================
  // GET ALL BOOK COPIES
  // =========================
  async findAll() {
    const bookCopies =
      await db.orm.public.BookCopy
        .all();

    const result = [];

    for (const bookCopy of bookCopies) {
      const book =
        await db.orm.public.Book
          .where({
            id: bookCopy.bookId,
          })
          .first();

      result.push({
        id:
          bookCopy.id,

        barcode:
          bookCopy.barcode,

        bookId:
          bookCopy.bookId,

        shelfLocation:
          bookCopy.shelfLocation,

        homeLocation:
          bookCopy.homeLocation,

        status:
          bookCopy.status,

        book: book
          ? {
              id:
                book.id,

              title:
                book.title,

              isbn:
                book.isbn,

              author:
                book.author,
            }
          : null,

        createdAt:
          bookCopy.createdAt,

        updatedAt:
          bookCopy.updatedAt,
      });
    }

    return result;
  }

  // =========================
  // GET BOOK COPY BY ID
  // =========================
  async findOne(id: number) {
    const bookCopy =
      await db.orm.public.BookCopy
        .where({ id })
        .first();

    if (!bookCopy) {
      throw new NotFoundException(
        'Copy buku tidak ditemukan',
      );
    }

    const book =
      await db.orm.public.Book
        .where({
          id: bookCopy.bookId,
        })
        .first();

    return {
      id:
        bookCopy.id,

      barcode:
        bookCopy.barcode,

      bookId:
        bookCopy.bookId,

      shelfLocation:
        bookCopy.shelfLocation,

      homeLocation:
        bookCopy.homeLocation,

      status:
        bookCopy.status,

      book: book
        ? {
            id:
              book.id,

            title:
              book.title,

            isbn:
              book.isbn,

            author:
              book.author,
          }
        : null,

      createdAt:
        bookCopy.createdAt,

      updatedAt:
        bookCopy.updatedAt,
    };
  }

  // =========================
  // UPDATE BOOK COPY
  // =========================
  async update(
    id: number,
    updateBookCopyDto: UpdateBookCopyDto,
  ) {
    // Cari copy buku
    const bookCopy =
      await db.orm.public.BookCopy
        .where({ id })
        .first();

    if (!bookCopy) {
      throw new NotFoundException(
        'Copy buku tidak ditemukan',
      );
    }

    const {
      barcode,
      bookId,
      shelfLocation,
    } = updateBookCopyDto;

    // Cek barcode jika diubah
    if (
      barcode !== undefined &&
      barcode !== bookCopy.barcode
    ) {
      const existingBookCopy =
        await db.orm.public.BookCopy
          .where({ barcode })
          .first();

      if (existingBookCopy) {
        throw new BadRequestException(
          'Barcode sudah digunakan',
        );
      }
    }

    // Tentukan buku yang digunakan
    let bookIdToUse =
      bookCopy.bookId;

    if (
      bookId !== undefined &&
      bookId !== bookCopy.bookId
    ) {
      const book =
        await db.orm.public.Book
          .where({ id: bookId })
          .first();

      if (!book) {
        throw new NotFoundException(
          'Buku tidak ditemukan',
        );
      }

      bookIdToUse =
        bookId;
    }

    // =========================
    // UPDATE COPY BUKU
    // =========================
    //
    // Penting:
    // shelfLocation boleh berubah.
    //
    // homeLocation TIDAK berubah.
    // Karena homeLocation adalah lokasi
    // asal/default eksemplar.
    const updatedBookCopy =
      await db.orm.public.BookCopy
        .where({ id })
        .update({
          barcode:
            barcode !== undefined
              ? barcode
              : bookCopy.barcode,

          bookId:
            bookIdToUse,

          shelfLocation:
            shelfLocation !== undefined
              ? shelfLocation
              : bookCopy.shelfLocation,

          homeLocation:
            bookCopy.homeLocation,

          updatedAt:
            new Date().toISOString(),
        });

    if (!updatedBookCopy) {
      throw new NotFoundException(
        'Copy buku tidak ditemukan',
      );
    }

    const book =
      await db.orm.public.Book
        .where({
          id:
            updatedBookCopy.bookId,
        })
        .first();

    return {
      message:
        'Copy buku berhasil diperbarui',

      bookCopy: {
        id:
          updatedBookCopy.id,

        barcode:
          updatedBookCopy.barcode,

        bookId:
          updatedBookCopy.bookId,

        shelfLocation:
          updatedBookCopy.shelfLocation,

        homeLocation:
          updatedBookCopy.homeLocation,

        status:
          updatedBookCopy.status,

        book: book
          ? {
              id:
                book.id,

              title:
                book.title,

              isbn:
                book.isbn,

              author:
                book.author,
            }
          : null,

        createdAt:
          updatedBookCopy.createdAt,

        updatedAt:
          updatedBookCopy.updatedAt,
      },
    };
  }

  // =========================
  // DELETE BOOK COPY
  // =========================
  async remove(id: number) {
    const bookCopy =
      await db.orm.public.BookCopy
        .where({ id })
        .first();

    if (!bookCopy) {
      throw new NotFoundException(
        'Copy buku tidak ditemukan',
      );
    }

    // Cek apakah copy buku memiliki
    // riwayat peminjaman
    const loans =
      await db.orm.public.Loan
        .where({
          bookCopyId: id,
        })
        .all();

    if (loans.length > 0) {
      throw new BadRequestException(
        'Copy buku memiliki riwayat peminjaman dan tidak dapat dihapus',
      );
    }

    // Hapus copy buku
    await db.orm.public.BookCopy
      .where({ id })
      .delete();

    return {
      message:
        'Copy buku berhasil dihapus',
    };
  }
}