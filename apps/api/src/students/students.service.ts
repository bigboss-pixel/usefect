import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { db } from '../prisma/db.js';

import { CreateStudentDto } from './dto/create-student.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';

@Injectable()
export class StudentsService {
  async create(
    createStudentDto: CreateStudentDto,
  ) {
    const {
      userId,
      npm,
      faculty,
      studyProgram,
      enrollmentYear,
    } = createStudentDto;

    // Cek apakah User ada
    const user = await db.orm.public.User
      .where({ id: userId })
      .first();

    if (!user) {
      throw new NotFoundException(
        'User tidak ditemukan',
      );
    }

    // Cek apakah User sudah memiliki profil mahasiswa
    const existingStudent =
      await db.orm.public.StudentProfile
        .where({ userId })
        .first();

    if (existingStudent) {
      throw new BadRequestException(
        'User sudah memiliki profil mahasiswa',
      );
    }

    // Cek apakah NPM sudah digunakan
    const existingNpm =
      await db.orm.public.StudentProfile
        .where({ npm })
        .first();

    if (existingNpm) {
      throw new BadRequestException(
        'NPM sudah digunakan',
      );
    }

    const student =
      await db.orm.public.StudentProfile
        .create({
          userId,
          npm,
          faculty: faculty ?? null,
          studyProgram: studyProgram ?? null,
          enrollmentYear:
            enrollmentYear ?? null,
        });

    return {
      message:
        'Profil mahasiswa berhasil dibuat',

      student: {
        id: student.id,
        userId: student.userId,
        npm: student.npm,
        faculty: student.faculty,
        studyProgram: student.studyProgram,
        enrollmentYear:
          student.enrollmentYear,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      },
    };
  }

  async findAll() {
    const students =
      await db.orm.public.StudentProfile
        .all();

    const result = [];

    for (const student of students) {
      const user =
        await db.orm.public.User
          .where({
            id: student.userId,
          })
          .first();

      result.push({
        id: student.id,
        userId: student.userId,

        npm: student.npm,

        fullName:
          user?.fullName ?? null,

        email:
          user?.email ?? null,

        username:
          user?.username ?? null,

        faculty: student.faculty,

        studyProgram:
          student.studyProgram,

        enrollmentYear:
          student.enrollmentYear,

        createdAt:
          student.createdAt,

        updatedAt:
          student.updatedAt,
      });
    }

    return result;
  }

  async findOne(id: number) {
    const student =
      await db.orm.public.StudentProfile
        .where({ id })
        .first();

    if (!student) {
      throw new NotFoundException(
        'Mahasiswa tidak ditemukan',
      );
    }

    const user =
      await db.orm.public.User
        .where({
          id: student.userId,
        })
        .first();

    return {
      id: student.id,
      userId: student.userId,

      npm: student.npm,

      fullName:
        user?.fullName ?? null,

      email:
        user?.email ?? null,

      username:
        user?.username ?? null,

      faculty: student.faculty,

      studyProgram:
        student.studyProgram,

      enrollmentYear:
        student.enrollmentYear,

      createdAt:
        student.createdAt,

      updatedAt:
        student.updatedAt,
    };
  }

  async update(
    id: number,
    updateStudentDto: UpdateStudentDto,
  ) {
    // Cari mahasiswa
    const student =
      await db.orm.public.StudentProfile
        .where({ id })
        .first();

    if (!student) {
      throw new NotFoundException(
        'Mahasiswa tidak ditemukan',
      );
    }

    const {
      npm,
      faculty,
      studyProgram,
      enrollmentYear,
    } = updateStudentDto;

    // Cek NPM jika ingin diubah
    if (
      npm !== undefined &&
      npm !== student.npm
    ) {
      const existingNpm =
        await db.orm.public.StudentProfile
          .where({ npm })
          .first();

      if (existingNpm) {
        throw new BadRequestException(
          'NPM sudah digunakan',
        );
      }
    }

    // Update profil mahasiswa
   const updatedStudent =
  await db.orm.public.StudentProfile
    .where({ id })
    .update({
      npm:
        npm !== undefined
          ? npm
          : student.npm,

      faculty:
        faculty !== undefined
          ? faculty
          : student.faculty,

      studyProgram:
        studyProgram !== undefined
          ? studyProgram
          : student.studyProgram,

      enrollmentYear:
        enrollmentYear !== undefined
          ? enrollmentYear
          : student.enrollmentYear,

      updatedAt:
        new Date().toISOString(),
    });

    if (!updatedStudent) {
      throw new NotFoundException(
        'Mahasiswa tidak ditemukan',
      );
    }

    const user =
      await db.orm.public.User
        .where({
          id: updatedStudent.userId,
        })
        .first();

    return {
      message:
        'Profil mahasiswa berhasil diperbarui',

      student: {
        id: updatedStudent.id,
        userId: updatedStudent.userId,

        npm: updatedStudent.npm,

        fullName:
          user?.fullName ?? null,

        email:
          user?.email ?? null,

        username:
          user?.username ?? null,

        faculty:
          updatedStudent.faculty,

        studyProgram:
          updatedStudent.studyProgram,

        enrollmentYear:
          updatedStudent.enrollmentYear,

        createdAt:
          updatedStudent.createdAt,

        updatedAt:
          updatedStudent.updatedAt,
      },
    };
  }

    async remove(id: number) {
  const student =
    await db.orm.public.StudentProfile
      .where({ id })
      .first();

  if (!student) {
    throw new NotFoundException(
      'Mahasiswa tidak ditemukan',
    );
  }

  // Cek apakah mahasiswa memiliki riwayat peminjaman
  const loans =
    await db.orm.public.Loan
      .where({ userId: student.userId })
      .all();

  if (loans.length > 0) {
    throw new BadRequestException(
      'Profil mahasiswa memiliki riwayat peminjaman dan tidak dapat dihapus',
    );
  }

  // Hapus profil mahasiswa
  await db.orm.public.StudentProfile
    .where({ id })
    .delete();

  return {
    message:
      'Profil mahasiswa berhasil dihapus',
  };
}  

}