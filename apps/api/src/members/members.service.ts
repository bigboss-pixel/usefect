import * as bcrypt from 'bcrypt';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { db } from '../prisma/db.js';
import { CreateMemberDto } from './dto/create-member.dto.js';

@Injectable()
export class MembersService {
  private async getMemberData(
    idOrUser:
      | number
      | Awaited<ReturnType<typeof db.orm.public.User.first>>,
    roleCache = new Map<number, string>(),
  ) {
    const user =
      typeof idOrUser === 'number'
        ? await db.orm.public.User.where({ id: idOrUser }).first()
        : idOrUser;

    if (!user) {
      throw new NotFoundException('Anggota tidak ditemukan');
    }

    const studentProfile =
      await db.orm.public.StudentProfile.where({ userId: user.id }).first();

    const lecturerProfile =
      await db.orm.public.LecturerProfile.where({ userId: user.id }).first();

    const userRoles =
      await db.orm.public.UserRole.where({ userId: user.id }).all();

    const roles: string[] = [];

    for (const userRole of userRoles) {
      let roleName = roleCache.get(userRole.roleId);

      if (roleName === undefined) {
        const role =
          await db.orm.public.Role.where({ id: userRole.roleId }).first();

        if (role) {
          roleName = role.name;
          roleCache.set(userRole.roleId, role.name);
        }
      }

      if (roleName) {
        roles.push(roleName);
      }
    }

    return {
      user,
      studentProfile,
      lecturerProfile,
      roles,
    };
  }

  private isAdministrativeRole(
    roles: string[],
  ) {
    return (
      roles.includes('ADMIN') ||
      roles.includes('SUPER_ADMIN')
    );
  }

  async create(data: CreateMemberDto) {
    const existingEmail =
      await db.orm.public.User
        .where({ email: data.email })
        .first();

    if (existingEmail) {
      throw new BadRequestException(
        'Email sudah terdaftar',
      );
    }

    if (data.username) {
      const existingUsername =
        await db.orm.public.User
          .where({ username: data.username })
          .first();

      if (existingUsername) {
        throw new BadRequestException(
          'Username sudah terdaftar',
        );
      }
    }

    if (
      data.type === 'MAHASISWA' &&
      !data.npm
    ) {
      throw new BadRequestException(
        'NPM wajib diisi untuk mahasiswa',
      );
    }

    if (
      data.type === 'DOSEN' &&
      !data.lecturerNumber
    ) {
      throw new BadRequestException(
        'Nomor dosen wajib diisi untuk dosen',
      );
    }

    if (data.type === 'MAHASISWA') {
      const existingNpm =
        await db.orm.public.StudentProfile
          .where({ npm: data.npm! })
          .first();

      if (existingNpm) {
        throw new BadRequestException(
          'NPM sudah terdaftar',
        );
      }
    }

    if (data.type === 'DOSEN') {
      const existingLecturerNumber =
        await db.orm.public.LecturerProfile
          .where({
            lecturerNumber:
              data.lecturerNumber!,
          })
          .first();

      if (existingLecturerNumber) {
        throw new BadRequestException(
          'Nomor dosen sudah terdaftar',
        );
      }
    }

    const passwordHash =
      await bcrypt.hash(data.password, 10);

    const user =
      await db.orm.public.User.create({
        email: data.email,
        username: data.username ?? null,
        fullName: data.fullName,
        passwordHash,
        phone: data.phone ?? null,
      });

    const roleName =
      data.type === 'MAHASISWA'
        ? 'STUDENT'
        : data.type === 'DOSEN'
          ? 'LECTURER'
          : 'PUBLIC';

    const role =
      await db.orm.public.Role
        .where({ name: roleName })
        .first();

    if (!role) {
      throw new BadRequestException(
        `Role ${roleName} tidak ditemukan`,
      );
    }

    await db.orm.public.UserRole.create({
      userId: user.id,
      roleId: role.id,
    });

    if (data.type === 'MAHASISWA') {
      await db.orm.public.StudentProfile.create({
        userId: user.id,
        npm: data.npm!,
        faculty: data.faculty ?? null,
        studyProgram:
          data.studyProgram ?? null,
        enrollmentYear:
          data.enrollmentYear ?? null,
      });
    }

    if (data.type === 'DOSEN') {
      await db.orm.public.LecturerProfile.create({
        userId: user.id,
        lecturerNumber:
          data.lecturerNumber!,
        faculty: data.faculty ?? null,
        studyProgram:
          data.studyProgram ?? null,
      });
    }

    return {
      message: 'Anggota berhasil ditambahkan',
      member: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        phone: user.phone,
        type: data.type,
        isActive: user.isActive,
      },
    };
  }

  async findAll() {
    const users =
      await db.orm.public.User.all();

    const members = [];
    const roleCache = new Map<number, string>();

    for (const user of users) {
      const data =
        await this.getMemberData(user, roleCache);

      if (
        this.isAdministrativeRole(data.roles)
      ) {
        continue;
      }

      const type =
        data.studentProfile
          ? 'MAHASISWA'
          : data.lecturerProfile
            ? 'DOSEN'
            : 'ANGGOTA';

      members.push({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        phone: user.phone,
        isActive: user.isActive,
        type,
        npm:
          data.studentProfile?.npm ?? null,
        lecturerNumber:
          data.lecturerProfile
            ?.lecturerNumber ?? null,
        faculty:
          data.studentProfile?.faculty ??
          data.lecturerProfile?.faculty ??
          null,
        studyProgram:
          data.studentProfile?.studyProgram ??
          data.lecturerProfile?.studyProgram ??
          null,
        enrollmentYear:
          data.studentProfile?.enrollmentYear ??
          null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    }

    return members;
  }

  async findOne(id: number) {
    const data = await this.getMemberData(id);

    if (
      this.isAdministrativeRole(data.roles)
    ) {
      throw new BadRequestException(
        'Akun administratif bukan anggota',
      );
    }

    const activeLoans =
      await db.orm.public.Loan
        .where({
          userId: id,
          status: 'ACTIVE',
        })
        .all();

    const overdueLoans =
      await db.orm.public.Loan
        .where({
          userId: id,
          status: 'OVERDUE',
        })
        .all();

    return {
      id: data.user.id,
      fullName: data.user.fullName,
      email: data.user.email,
      username: data.user.username,
      phone: data.user.phone,
      isActive: data.user.isActive,

      type:
        data.studentProfile
          ? 'MAHASISWA'
          : data.lecturerProfile
            ? 'DOSEN'
            : 'ANGGOTA',

      npm:
        data.studentProfile?.npm ?? null,

      lecturerNumber:
        data.lecturerProfile
          ?.lecturerNumber ?? null,

      faculty:
        data.studentProfile?.faculty ??
        data.lecturerProfile?.faculty ??
        null,

      studyProgram:
        data.studentProfile?.studyProgram ??
        data.lecturerProfile?.studyProgram ??
        null,

      enrollmentYear:
        data.studentProfile?.enrollmentYear ??
        null,

      roles: data.roles,

      statistics: {
        activeLoans: activeLoans.length,
        overdueLoans: overdueLoans.length,
      },

      createdAt: data.user.createdAt,
      updatedAt: data.user.updatedAt,
    };
  }

  async update(
    id: number,
    data: {
      fullName?: string;
      email?: string;
      username?: string;
      phone?: string;
      npm?: string;
      lecturerNumber?: string;
      faculty?: string;
      studyProgram?: string;
      enrollmentYear?: number;
    },
  ) {
    const member = await this.getMemberData(id);

    if (
      this.isAdministrativeRole(member.roles)
    ) {
      throw new BadRequestException(
        'Akun administratif tidak dapat dikelola melalui Manajemen Anggota',
      );
    }

    const user =
      await db.orm.public.User
        .where({ id })
        .first();

    if (!user) {
      throw new NotFoundException(
        'Anggota tidak ditemukan',
      );
    }

    if (
      data.email !== undefined &&
      data.email !== user.email
    ) {
      const existingEmail =
        await db.orm.public.User
          .where({ email: data.email })
          .first();

      if (
        existingEmail &&
        existingEmail.id !== id
      ) {
        throw new BadRequestException(
          'Email sudah digunakan oleh akun lain',
        );
      }
    }

    if (
      data.username !== undefined &&
      data.username !== user.username
    ) {
      const existingUsername =
        await db.orm.public.User
          .where({ username: data.username })
          .first();

      if (
        existingUsername &&
        existingUsername.id !== id
      ) {
        throw new BadRequestException(
          'Username sudah digunakan oleh akun lain',
        );
      }
    }

    const type =
      member.studentProfile
        ? 'MAHASISWA'
        : member.lecturerProfile
          ? 'DOSEN'
          : 'ANGGOTA';

    if (
      type === 'MAHASISWA' &&
      data.npm !== undefined &&
      data.npm !== member.studentProfile?.npm
    ) {
      const existingNpm =
        await db.orm.public.StudentProfile
          .where({ npm: data.npm })
          .first();

      if (
        existingNpm &&
        existingNpm.userId !== id
      ) {
        throw new BadRequestException(
          'NPM sudah digunakan oleh anggota lain',
        );
      }
    }

    if (
      type === 'DOSEN' &&
      data.lecturerNumber !== undefined &&
      data.lecturerNumber !==
        member.lecturerProfile?.lecturerNumber
    ) {
      const existingLecturerNumber =
        await db.orm.public.LecturerProfile
          .where({
            lecturerNumber:
              data.lecturerNumber,
          })
          .first();

      if (
        existingLecturerNumber &&
        existingLecturerNumber.userId !== id
      ) {
        throw new BadRequestException(
          'Nomor dosen sudah digunakan oleh anggota lain',
        );
      }
    }

    const updated =
      await db.orm.public.User
        .where({ id })
        .update({
          ...(data.fullName !== undefined
            ? { fullName: data.fullName }
            : {}),
          ...(data.email !== undefined
            ? { email: data.email }
            : {}),
          ...(data.username !== undefined
            ? { username: data.username }
            : {}),
          ...(data.phone !== undefined
            ? { phone: data.phone || null }
            : {}),
        });

    if (!updated) {
      throw new NotFoundException(
        'Anggota tidak ditemukan',
      );
    }

    if (type === 'MAHASISWA') {
      await db.orm.public.StudentProfile
        .where({ userId: id })
        .update({
          ...(data.npm !== undefined
            ? { npm: data.npm }
            : {}),
          ...(data.faculty !== undefined
            ? { faculty: data.faculty || null }
            : {}),
          ...(data.studyProgram !== undefined
            ? {
                studyProgram:
                  data.studyProgram || null,
              }
            : {}),
          ...(data.enrollmentYear !== undefined
            ? {
                enrollmentYear:
                  data.enrollmentYear,
              }
            : {}),
        });
    }

    if (type === 'DOSEN') {
      await db.orm.public.LecturerProfile
        .where({ userId: id })
        .update({
          ...(data.lecturerNumber !== undefined
            ? {
                lecturerNumber:
                  data.lecturerNumber,
              }
            : {}),
          ...(data.faculty !== undefined
            ? { faculty: data.faculty || null }
            : {}),
          ...(data.studyProgram !== undefined
            ? {
                studyProgram:
                  data.studyProgram || null,
              }
            : {}),
        });
    }

    return {
      message:
        'Data anggota berhasil diperbarui',
      member: {
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        username: updated.username,
        phone: updated.phone,
        type,
        npm:
          type === 'MAHASISWA'
            ? data.npm ??
              member.studentProfile?.npm ??
              null
            : null,
        lecturerNumber:
          type === 'DOSEN'
            ? data.lecturerNumber ??
              member.lecturerProfile?.lecturerNumber ??
              null
            : null,
        faculty:
          data.faculty ??
          member.studentProfile?.faculty ??
          member.lecturerProfile?.faculty ??
          null,
        studyProgram:
          data.studyProgram ??
          member.studentProfile?.studyProgram ??
          member.lecturerProfile?.studyProgram ??
          null,
        enrollmentYear:
          type === 'MAHASISWA'
            ? data.enrollmentYear ??
              member.studentProfile?.enrollmentYear ??
              null
            : null,
        isActive: updated.isActive,
      },
    };
  }

  async resetPassword(
    id: number,
    password: string,
  ) {
    const member = await this.getMemberData(id);

    if (
      this.isAdministrativeRole(member.roles)
    ) {
      throw new BadRequestException(
        'Password akun administratif tidak dapat diubah melalui Manajemen Anggota',
      );
    }

    const user =
      await db.orm.public.User
        .where({ id })
        .first();

    if (!user) {
      throw new NotFoundException(
        'Anggota tidak ditemukan',
      );
    }

    const passwordHash =
      await bcrypt.hash(password, 10);

    const updated =
      await db.orm.public.User
        .where({ id })
        .update({
          passwordHash,
          refreshTokenHash: null,
        });

    if (!updated) {
      throw new NotFoundException(
        'Anggota tidak ditemukan',
      );
    }

    return {
      message:
        'Password anggota berhasil direset',
      member: {
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
      },
    };
  }

  async delete(id: number) {
    const member = await this.getMemberData(id);

    if (
      this.isAdministrativeRole(member.roles)
    ) {
      throw new BadRequestException(
        'Akun administratif tidak dapat dihapus melalui Manajemen Anggota',
      );
    }

    const activeLoans =
      await db.orm.public.Loan
        .where({
          userId: id,
          status: 'ACTIVE',
        })
        .all();

    const overdueLoans =
      await db.orm.public.Loan
        .where({
          userId: id,
          status: 'OVERDUE',
        })
        .all();

    if (
      activeLoans.length > 0 ||
      overdueLoans.length > 0
    ) {
      throw new BadRequestException(
        'Anggota tidak dapat dihapus karena masih memiliki peminjaman aktif atau terlambat',
      );
    }

    const reservations =
      await db.orm.public.Reservation
        .where({
          userId: id,
        })
        .all();

    const activeReservationStatuses = [
      'PENDING',
      'APPROVED',
      'READY_FOR_PICKUP',
    ];

    const activeReservations =
      reservations.filter((reservation) =>
        activeReservationStatuses.includes(
          reservation.status,
        ),
      );

    if (activeReservations.length > 0) {
      throw new BadRequestException(
        'Anggota tidak dapat dihapus karena masih memiliki reservasi aktif',
      );
    }

    await db.orm.public.StudentProfile
      .where({ userId: id })
      .delete();

    await db.orm.public.LecturerProfile
      .where({ userId: id })
      .delete();

    await db.orm.public.UserRole
      .where({ userId: id })
      .delete();

    const deleted =
      await db.orm.public.User
        .where({ id })
        .delete();

    if (!deleted) {
      throw new NotFoundException(
        'Anggota tidak ditemukan',
      );
    }

    return {
      message:
        'Anggota berhasil dihapus',
      id,
    };
  }

  async updateStatus(
    id: number,
    isActive: boolean,
  ) {
    const member = await this.getMemberData(id);

    if (
      this.isAdministrativeRole(member.roles)
    ) {
      throw new BadRequestException(
        'Akun administratif tidak dapat dikelola melalui Manajemen Anggota',
      );
    }

    const updated =
      await db.orm.public.User
        .where({ id })
        .update({
          isActive,
        });

    if (!updated) {
      throw new NotFoundException(
        'Anggota tidak ditemukan',
      );
    }

    return {
      message: isActive
        ? 'Anggota berhasil diaktifkan'
        : 'Anggota berhasil dinonaktifkan',
      member: {
        id: updated.id,
        fullName: updated.fullName,
        isActive: updated.isActive,
      },
    };
  }
}
