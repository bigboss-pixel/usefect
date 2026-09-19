import { BookQueryDto } from './dto/book-query.dto.js';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { db } from '../prisma/db.js';

import { CreateBookDto } from './dto/create-book.dto.js';
import { UpdateBookDto } from './dto/update-book.dto.js';

@Injectable()
export class BooksService {
  // =========================
  // CREATE BOOK
  // =========================
  async create(
    createBookDto: CreateBookDto,
  ) {
    const {
      title,
      isbn,
      author,
      publisher,
      publicationYear,
      description,
      categoryId,
    } = createBookDto;

    // Cek ISBN
    const existingBook =
      await db.orm.public.Book
        .where({ isbn })
        .first();

    if (existingBook) {
      throw new BadRequestException(
        'ISBN sudah digunakan',
      );
    }

    // Cek kategori
    const category =
      await db.orm.public.Category
        .where({ id: categoryId })
        .first();

    if (!category) {
      throw new NotFoundException(
        'Kategori tidak ditemukan',
      );
    }

    // Buat buku
    const book =
      await db.orm.public.Book
        .create({
          title,
          isbn,
          author,

          publisher:
            publisher ?? null,

          publicationYear:
            publicationYear ?? null,

          description:
            description ?? null,

          categoryId,
        });

    return {
      message:
        'Buku berhasil dibuat',

      book: {
        id: book.id,
        title: book.title,
        isbn: book.isbn,
        author: book.author,
        publisher: book.publisher,
        publicationYear:
          book.publicationYear,
        description:
          book.description,
        categoryId:
          book.categoryId,
        category: {
          id: category.id,
          name: category.name,
        },
        createdAt:
          book.createdAt,
        updatedAt:
          book.updatedAt,
      },
    };
  }

  // =========================
  // GET ALL BOOKS
  // SEARCH + FILTER + PAGINATION
  // =========================
    async findAll(params?: BookQueryDto) {
    const search =
      params?.search?.trim().toLowerCase();

    const categoryId = params?.categoryId;
    const publicationYear = params?.publicationYear;

    const page = Math.max(params?.page ?? 1, 1);
    const limit = Math.min(Math.max(params?.limit ?? 10, 1), 100);

    const sortBy =
      params?.sortBy ?? 'title';

    const sortOrder =
      params?.sortOrder === 'desc'
        ? 'desc'
        : 'asc';

    let books =
      await db.orm.public.Book.all();

    // =========================
    // SEARCH
    // =========================
    if (search) {
      books = books.filter((book) => {
        return (
          book.title
            .toLowerCase()
            .includes(search) ||
          book.author
            .toLowerCase()
            .includes(search) ||
          book.isbn
            .toLowerCase()
            .includes(search)
        );
      });
    }

    // =========================
    // FILTER CATEGORY
    // =========================
    if (
      categoryId !== undefined &&
      !Number.isNaN(categoryId)
    ) {
      books = books.filter(
        (book) =>
          book.categoryId === categoryId,
      );
    }

    // =========================
    // FILTER YEAR
    // =========================
    if (
      publicationYear !== undefined &&
      !Number.isNaN(publicationYear)
    ) {
      books = books.filter(
        (book) =>
          book.publicationYear ===
          publicationYear,
      );
    }


    // =========================
    // FILTER AVAILABILITY
    // =========================
    if (params?.isAvailable === true) {
      const availableBookIds: number[] = [];

      for (const book of books) {
        const availableCopies =
          await db.orm.public.BookCopy
            .where({
              bookId: book.id,
            })
            .all();

        const hasAvailableCopy =
          availableCopies.some(
            (copy) =>
              copy.status === 'AVAILABLE',
          );

        if (hasAvailableCopy) {
          availableBookIds.push(book.id);
        }
      }

      books = books.filter((book) =>
        availableBookIds.includes(book.id),
      );
    }

    // =========================
    // SORTING
    // =========================
    books.sort((a, b) => {
      let valueA: string | number =
        a.title;
      let valueB: string | number =
        b.title;

      if (sortBy === 'author') {
        valueA = a.author;
        valueB = b.author;
      }

      if (sortBy === 'publicationYear') {
        valueA =
          a.publicationYear ?? 0;
        valueB =
          b.publicationYear ?? 0;
      }

      if (
        typeof valueA === 'string' &&
        typeof valueB === 'string'
      ) {
        const comparison =
          valueA.localeCompare(valueB);

        return sortOrder === 'desc'
          ? -comparison
          : comparison;
      }

      const comparison =
        Number(valueA) -
        Number(valueB);

      return sortOrder === 'desc'
        ? -comparison
        : comparison;
    });

    const total = books.length;

    const totalPages =
      Math.ceil(total / limit);

    const skip =
      (page - 1) * limit;

    const paginatedBooks =
      books.slice(
        skip,
        skip + limit,
      );

    const result = [];

    for (const book of paginatedBooks) {
      
      const copies =
              await db.orm.public.BookCopy
              .where({
                bookId: book.id,
            })
          .all();

        const totalCopies = copies.length;

      const availableCopies =
        copies.filter(
          (copy) =>
            copy.status === 'AVAILABLE',
        ).length;

      const borrowedCopies =
          copies.filter(
          (copy) =>
          copy.status === 'BORROWED',
        ).length;

      const locations = [
         ...new Set(
        copies
        .filter(
          (copy) =>
          copy.status === 'AVAILABLE',
        )
        .map(
        (copy) =>
          copy.shelfLocation,
        )
        .filter(
          (
          location,
          ): location is string =>
          Boolean(location),
        ),
        ),
      ];

      const category =
        await db.orm.public.Category
          .where({
            id: book.categoryId,
          })
          .first();

      result.push({
        id: book.id,
        title: book.title,
        isbn: book.isbn,
        author: book.author,
        publisher: book.publisher,
        publicationYear:
          book.publicationYear,
        description:
          book.description,
        categoryId:
          book.categoryId,

        category: category
          ? {
              id: category.id,
              name: category.name,
            }
          : null,

        createdAt:
          book.createdAt,
        updatedAt:
          book.updatedAt,

          availability: {
            total: totalCopies,
            available: availableCopies,
              borrowed: borrowedCopies,
            isAvailable:
              availableCopies > 0,
              locations,
              },
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
  // GET BOOK BY ID
  // =========================
  async findOne(id: number) {
    const book =
      await db.orm.public.Book
        .where({ id })
        .first();

      if (!book) {
      throw new NotFoundException(
        'Buku tidak ditemukan',
      );
      }

        const copies =
        await db.orm.public.BookCopy
        .where({
          bookId: book.id,
        })
        .all();

        const totalCopies = copies.length;

      const availableCopies =
      copies.filter(
      (copy) =>
      copy.status === 'AVAILABLE',
      ).length;

      const borrowedCopies =
      copies.filter(
      (copy) =>
        copy.status === 'BORROWED',
        ).length;

        const locations = [
          ...new Set(
          copies
          .filter(
          (copy) =>
          copy.status === 'AVAILABLE',
          )
          .map(
          (copy) =>
          copy.shelfLocation,
          )
          .filter(
          (
          location,
          ): location is string =>
          Boolean(location),
          ),
          ),
        ];

    const category =
      await db.orm.public.Category
        .where({
          id: book.categoryId,
        })
        .first();

    return {
      id: book.id,
      title: book.title,
      isbn: book.isbn,
      author: book.author,
      publisher: book.publisher,
      publicationYear:
        book.publicationYear,
      description:
        book.description,
      categoryId:
        book.categoryId,

      category: category
        ? {
            id: category.id,
            name: category.name,
          }
        : null,

      createdAt:
        book.createdAt,
      updatedAt:
        book.updatedAt,
       availability: {
  total: totalCopies,
  available: availableCopies,
  borrowed: borrowedCopies,
  isAvailable:
    availableCopies > 0,
  locations,

  availableCopies: copies
    .filter(
      (copy) =>
        copy.status === 'AVAILABLE',
    )
    .map((copy) => ({
      id: copy.id,
      barcode: copy.barcode,
      shelfLocation:
        copy.shelfLocation,
    })),
},
    };
  }

  // =========================
  // UPDATE BOOK
  // =========================
  async update(
    id: number,
    updateBookDto: UpdateBookDto,
  ) {
    // Cari buku
    const book =
      await db.orm.public.Book
        .where({ id })
        .first();

    if (!book) {
      throw new NotFoundException(
        'Buku tidak ditemukan',
      );
    }

    const {
      title,
      isbn,
      author,
      publisher,
      publicationYear,
      description,
      categoryId,
    } = updateBookDto;

    // Cek ISBN jika diubah
    if (
      isbn !== undefined &&
      isbn !== book.isbn
    ) {
      const existingBook =
        await db.orm.public.Book
          .where({ isbn })
          .first();

      if (existingBook) {
        throw new BadRequestException(
          'ISBN sudah digunakan',
        );
      }
    }

    // Cek kategori jika diubah
    let categoryIdToUse =
      book.categoryId;

    if (
      categoryId !== undefined &&
      categoryId !== book.categoryId
    ) {
      const category =
        await db.orm.public.Category
          .where({ id: categoryId })
          .first();

      if (!category) {
        throw new NotFoundException(
          'Kategori tidak ditemukan',
        );
      }

      categoryIdToUse = categoryId;
    }

    // Update buku
    const updatedBook =
      await db.orm.public.Book
        .where({ id })
        .update({
          title:
            title !== undefined
              ? title
              : book.title,

          isbn:
            isbn !== undefined
              ? isbn
              : book.isbn,

          author:
            author !== undefined
              ? author
              : book.author,

          publisher:
            publisher !== undefined
              ? publisher
              : book.publisher,

          publicationYear:
            publicationYear !== undefined
              ? publicationYear
              : book.publicationYear,

          description:
            description !== undefined
              ? description
              : book.description,

          categoryId:
            categoryIdToUse,

          updatedAt:
            new Date().toISOString(),
        });

    if (!updatedBook) {
      throw new NotFoundException(
        'Buku tidak ditemukan',
      );
    }

    const category =
      await db.orm.public.Category
        .where({
          id: updatedBook.categoryId,
        })
        .first();

    return {
      message:
        'Buku berhasil diperbarui',

      book: {
        id: updatedBook.id,
        title: updatedBook.title,
        isbn: updatedBook.isbn,
        author: updatedBook.author,
        publisher: updatedBook.publisher,
        publicationYear:
          updatedBook.publicationYear,
        description:
          updatedBook.description,
        categoryId:
          updatedBook.categoryId,

        category: category
          ? {
              id: category.id,
              name: category.name,
            }
          : null,

        createdAt:
          updatedBook.createdAt,
        updatedAt:
          updatedBook.updatedAt,
      },
    };
  }

  // =========================
  // DELETE BOOK
  // =========================
    // =========================
// DELETE BOOK
// =========================
async remove(id: number) {
  const book =
    await db.orm.public.Book
      .where({ id })
      .first();

  if (!book) {
    throw new NotFoundException(
      'Buku tidak ditemukan',
    );
  }

  // Cek apakah buku masih memiliki copy
  const copies =
    await db.orm.public.BookCopy
      .where({ bookId: id })
      .all();

  if (copies.length > 0) {
    throw new BadRequestException(
      'Buku masih memiliki copy dan tidak dapat dihapus',
    );
  }

  // Hapus buku
  await db.orm.public.Book
    .where({ id })
    .delete();

  return {
    message:
      'Buku berhasil dihapus',
  };
  }
}