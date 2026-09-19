import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { db } from '../prisma/db.js';

import { CreateLecturerDto } from './dto/create-lecturer.dto.js';
import { UpdateLecturerDto } from './dto/update-lecturer.dto.js';

@Injectable()
export class LecturersService {
  async create(
    createLecturerDto: CreateLecturerDto,
  ) {
    const {
      userId,
      lecturerNumber,
      faculty,
      studyProgram,
    } = createLecturerDto;

    // Cek apakah User ada
    const user =
      await db.orm.public.User
        .where({ id: userId })
        .first();

    if (!user) {
      throw new NotFoundException(
        'User tidak ditemukan',
      );
    }

    // Cek apakah User sudah memiliki profil dosen
    const existingLecturer =
      await db.orm.public.LecturerProfile
        .where({ userId })
        .first();

    if (existingLecturer) {
      throw new BadRequestException(
        'User sudah memiliki profil dosen',
      );
    }

    // Cek apakah nomor dosen sudah digunakan
    const existingLecturerNumber =
      await db.orm.public.LecturerProfile
        .where({ lecturerNumber })
        .first();

    if (existingLecturerNumber) {
      throw new BadRequestException(
        'Nomor dosen sudah digunakan',
      );
    }

    // Buat profil dosen
    const lecturer =
      await db.orm.public.LecturerProfile
        .create({
          userId,
          lecturerNumber,
          faculty: faculty ?? null,
          studyProgram:
            studyProgram ?? null,
        });

    return {
      message:
        'Profil dosen berhasil dibuat',

      lecturer: {
        id: lecturer.id,
        userId: lecturer.userId,

        lecturerNumber:
          lecturer.lecturerNumber,

        faculty: lecturer.faculty,

        studyProgram:
          lecturer.studyProgram,

        createdAt:
          lecturer.createdAt,

        updatedAt:
          lecturer.updatedAt,
      },
    };
  }

  async findAll() {
    const lecturers =
      await db.orm.public.LecturerProfile
        .all();

    const result = [];

    for (const lecturer of lecturers) {
      const user =
        await db.orm.public.User
          .where({
            id: lecturer.userId,
          })
          .first();

      result.push({
        id: lecturer.id,

        userId: lecturer.userId,

        lecturerNumber:
          lecturer.lecturerNumber,

        fullName:
          user?.fullName ?? null,

        email:
          user?.email ?? null,

        username:
          user?.username ?? null,

        faculty:
          lecturer.faculty,

        studyProgram:
          lecturer.studyProgram,

        createdAt:
          lecturer.createdAt,

        updatedAt:
          lecturer.updatedAt,
      });
    }

    return result;
  }

  async findOne(id: number) {
    const lecturer =
      await db.orm.public.LecturerProfile
        .where({ id })
        .first();

    if (!lecturer) {
      throw new NotFoundException(
        'Dosen tidak ditemukan',
      );
    }

    const user =
      await db.orm.public.User
        .where({
          id: lecturer.userId,
        })
        .first();

    return {
      id: lecturer.id,

      userId: lecturer.userId,

      lecturerNumber:
        lecturer.lecturerNumber,

      fullName:
        user?.fullName ?? null,

      email:
        user?.email ?? null,

      username:
        user?.username ?? null,

      faculty:
        lecturer.faculty,

      studyProgram:
        lecturer.studyProgram,

      createdAt:
        lecturer.createdAt,

      updatedAt:
        lecturer.updatedAt,
    };
  }

  async update(
    id: number,
    updateLecturerDto: UpdateLecturerDto,
  ) {
    // Cari dosen
    const lecturer =
      await db.orm.public.LecturerProfile
        .where({ id })
        .first();

    if (!lecturer) {
      throw new NotFoundException(
        'Dosen tidak ditemukan',
      );
    }

    const {
      lecturerNumber,
      faculty,
      studyProgram,
    } = updateLecturerDto;

    // Cek nomor dosen jika ingin diubah
    if (
      lecturerNumber !== undefined &&
      lecturerNumber !==
        lecturer.lecturerNumber
    ) {
      const existingLecturerNumber =
        await db.orm.public.LecturerProfile
          .where({ lecturerNumber })
          .first();

      if (existingLecturerNumber) {
        throw new BadRequestException(
          'Nomor dosen sudah digunakan',
        );
      }
    }

    // Update profil dosen
    const updatedLecturer =
      await db.orm.public.LecturerProfile
        .where({ id })
        .update({
          lecturerNumber:
            lecturerNumber !== undefined
              ? lecturerNumber
              : lecturer.lecturerNumber,

          faculty:
            faculty !== undefined
              ? faculty
              : lecturer.faculty,

          studyProgram:
            studyProgram !== undefined
              ? studyProgram
              : lecturer.studyProgram,

          updatedAt:
            new Date().toISOString(),
        });

    if (!updatedLecturer) {
      throw new NotFoundException(
        'Dosen tidak ditemukan',
      );
    }

    const user =
      await db.orm.public.User
        .where({
          id: updatedLecturer.userId,
        })
        .first();

    return {
      message:
        'Profil dosen berhasil diperbarui',

      lecturer: {
        id: updatedLecturer.id,

        userId:
          updatedLecturer.userId,

        lecturerNumber:
          updatedLecturer.lecturerNumber,

        fullName:
          user?.fullName ?? null,

        email:
          user?.email ?? null,

        username:
          user?.username ?? null,

        faculty:
          updatedLecturer.faculty,

        studyProgram:
          updatedLecturer.studyProgram,

        createdAt:
          updatedLecturer.createdAt,

        updatedAt:
          updatedLecturer.updatedAt,
      },
    };
  }

  async remove(id: number) {
  const lecturer =
    await db.orm.public.LecturerProfile
      .where({ id })
      .first();

  if (!lecturer) {
    throw new NotFoundException(
      'Dosen tidak ditemukan',
    );
  }

  // Cek apakah dosen memiliki riwayat peminjaman
  const loans =
    await db.orm.public.Loan
      .where({ userId: lecturer.userId })
      .all();

  if (loans.length > 0) {
    throw new BadRequestException(
      'Profil dosen memiliki riwayat peminjaman dan tidak dapat dihapus',
    );
  }

  // Hapus profil dosen
  await db.orm.public.LecturerProfile
    .where({ id })
    .delete();

  return {
    message:
      'Profil dosen berhasil dihapus',
  };
}
}