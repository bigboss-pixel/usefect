import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { db } from '../prisma/db.js';

import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  async create(
    createCategoryDto: CreateCategoryDto,
  ) {
    const {
      name,
      description,
    } = createCategoryDto;

    // Cek apakah nama kategori sudah digunakan
    const existingCategory =
      await db.orm.public.Category
        .where({ name })
        .first();

    if (existingCategory) {
      throw new BadRequestException(
        'Nama kategori sudah digunakan',
      );
    }

    // Buat kategori
    const category =
      await db.orm.public.Category
        .create({
          name,
          description:
            description ?? null,
        });

    return {
      message:
        'Kategori berhasil dibuat',

      category: {
        id: category.id,
        name: category.name,
        description:
          category.description,
        createdAt:
          category.createdAt,
        updatedAt:
          category.updatedAt,
      },
    };
  }

  async findAll() {
    const categories =
      await db.orm.public.Category
        .all();

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      description:
        category.description,
      createdAt:
        category.createdAt,
      updatedAt:
        category.updatedAt,
    }));
  }

  async findOne(id: number) {
    const category =
      await db.orm.public.Category
        .where({ id })
        .first();

    if (!category) {
      throw new NotFoundException(
        'Kategori tidak ditemukan',
      );
    }

    return {
      id: category.id,
      name: category.name,
      description:
        category.description,
      createdAt:
        category.createdAt,
      updatedAt:
        category.updatedAt,
    };
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ) {
    // Cari kategori
    const category =
      await db.orm.public.Category
        .where({ id })
        .first();

    if (!category) {
      throw new NotFoundException(
        'Kategori tidak ditemukan',
      );
    }

    const {
      name,
      description,
    } = updateCategoryDto;

    // Cek nama kategori jika ingin diubah
    if (
      name !== undefined &&
      name !== category.name
    ) {
      const existingCategory =
        await db.orm.public.Category
          .where({ name })
          .first();

      if (existingCategory) {
        throw new BadRequestException(
          'Nama kategori sudah digunakan',
        );
      }
    }

    const updatedCategory =
      await db.orm.public.Category
        .where({ id })
        .update({
          name:
            name !== undefined
              ? name
              : category.name,

          description:
            description !== undefined
              ? description
              : category.description,

          updatedAt:
            new Date().toISOString(),
        });

    if (!updatedCategory) {
      throw new NotFoundException(
        'Kategori tidak ditemukan',
      );
    }

    return {
      message:
        'Kategori berhasil diperbarui',

      category: {
        id: updatedCategory.id,
        name: updatedCategory.name,
        description:
          updatedCategory.description,
        createdAt:
          updatedCategory.createdAt,
        updatedAt:
          updatedCategory.updatedAt,
      },
    };
  }

  async remove(id: number) {
  const category =
    await db.orm.public.Category
      .where({ id })
      .first();

  if (!category) {
    throw new NotFoundException(
      'Kategori tidak ditemukan',
    );
  }

  // Cek apakah kategori masih digunakan oleh buku
  const books =
    await db.orm.public.Book
      .where({ categoryId: id })
      .all();

  if (books.length > 0) {
    throw new BadRequestException(
      'Kategori masih digunakan oleh buku dan tidak dapat dihapus',
    );
  }

  await db.orm.public.Category
    .where({ id })
    .delete();

  return {
    message:
      'Kategori berhasil dihapus',
  };
  }
}