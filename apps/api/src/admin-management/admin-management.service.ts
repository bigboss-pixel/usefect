import * as bcrypt from 'bcrypt';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { db } from '../prisma/db.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';

import { CreateAdminDto } from './dto/create-admin.dto.js';
import { UpdateAdminDto } from './dto/update-admin.dto.js';
import { UpdateAdminStatusDto } from './dto/update-admin-status.dto.js';
import { ResetAdminPasswordDto } from './dto/reset-admin-password.dto.js';
import { UpdateAdminRoleDto } from './dto/update-admin-role.dto.js';

@Injectable()
export class AdminManagementService {
  constructor(
    private readonly auditLogService: AuditLogService,
  ) {}

  private async getAdminWithRoles(id: number) {
    const user = await db.orm.public.User
      .where({ id })
      .first();

    if (!user) {
      throw new NotFoundException(
        'User tidak ditemukan',
      );
    }

    const userRoles =
      await db.orm.public.UserRole
        .where({ userId: id })
        .all();

    const roles = [];

    for (const userRole of userRoles) {
      const role =
        await db.orm.public.Role
          .where({ id: userRole.roleId })
          .first();

      if (role) {
        roles.push({
          id: role.id,
          name: role.name,
          description: role.description,
        });
      }
    }

    const isAdminAccount = roles.some((role) =>
      [
        'ADMIN',
        'LIBRARIAN',
        'SUPER_ADMIN',
      ].includes(role.name),
    );

    if (!isAdminAccount) {
      throw new BadRequestException(
        'User tersebut bukan akun administrator',
      );
    }

    return {
      user,
      roles,
    };
  }

  async findAll() {
    const users = await db.orm.public.User.all();

    const result = [];

    for (const user of users) {
      try {
        const admin =
          await this.getAdminWithRoles(user.id);

        result.push({
          id: admin.user.id,
          email: admin.user.email,
          username: admin.user.username,
          fullName: admin.user.fullName,
          phone: admin.user.phone,
          isActive: admin.user.isActive,
          roles: admin.roles,
          createdAt: admin.user.createdAt,
          updatedAt: admin.user.updatedAt,
        });
      } catch {
        // User non-administrator dilewati.
      }
    }

    return result;
  }

  async create(
    dto: CreateAdminDto,
    createdByUserId: number,
  ) {
    const existingEmail =
      await db.orm.public.User
        .where({ email: dto.email })
        .first();

    if (existingEmail) {
      throw new BadRequestException(
        'Email sudah digunakan',
      );
    }

    if (dto.username) {
      const existingUsername =
        await db.orm.public.User
          .where({ username: dto.username })
          .first();

      if (existingUsername) {
        throw new BadRequestException(
          'Username sudah digunakan',
        );
      }
    }

    const role =
      await db.orm.public.Role
        .where({ name: dto.role })
        .first();

    if (!role) {
      throw new NotFoundException(
        `Role ${dto.role} tidak ditemukan`,
      );
    }

    const passwordHash =
      await bcrypt.hash(dto.password, 12);

    const user =
      await db.orm.public.User.create({
        email: dto.email,
        username: dto.username ?? null,
        fullName: dto.fullName,
        passwordHash,
        phone: dto.phone ?? null,
        isActive: true,
      });

    await db.orm.public.UserRole.create({
      userId: user.id,
      roleId: role.id,
    });

    await this.auditLogService.create({
      userId: createdByUserId,
      action: 'ADMIN_CREATED',
      entity: 'User',
      entityId: user.id,
      description: `Akun ${dto.role} dibuat`,
      details:
        `Email: ${user.email} | Username: ${user.username ?? '-'} | ` +
        `Nama: ${user.fullName} | Role: ${dto.role}`,
    });

    return {
      message: 'Akun admin berhasil dibuat',

      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone,
        isActive: user.isActive,
      },

      role: {
        id: role.id,
        name: role.name,
        description: role.description,
      },
    };
  }

  async getAdmin(id: number) {
    const admin =
      await this.getAdminWithRoles(id);

    return {
      id: admin.user.id,
      email: admin.user.email,
      username: admin.user.username,
      fullName: admin.user.fullName,
      phone: admin.user.phone,
      isActive: admin.user.isActive,
      roles: admin.roles,
      createdAt: admin.user.createdAt,
      updatedAt: admin.user.updatedAt,
    };
  }

  async update(
    id: number,
    dto: UpdateAdminDto,
    actorUserId: number,
  ) {
    const admin =
      await this.getAdminWithRoles(id);

    const user = admin.user;

    if (
      dto.email !== undefined &&
      dto.email !== user.email
    ) {
      const existingEmail =
        await db.orm.public.User
          .where({ email: dto.email })
          .first();

      if (
        existingEmail &&
        existingEmail.id !== id
      ) {
        throw new BadRequestException(
          'Email sudah digunakan',
        );
      }
    }

    if (
      dto.username !== undefined &&
      dto.username !== user.username
    ) {
      const existingUsername =
        await db.orm.public.User
          .where({ username: dto.username })
          .first();

      if (
        existingUsername &&
        existingUsername.id !== id
      ) {
        throw new BadRequestException(
          'Username sudah digunakan',
        );
      }
    }

    const updatedUser =
      await db.orm.public.User
        .where({ id })
        .update({
          email:
            dto.email !== undefined
              ? dto.email
              : user.email,

          fullName:
            dto.fullName !== undefined
              ? dto.fullName
              : user.fullName,

          username:
            dto.username !== undefined
              ? dto.username
              : user.username,

          phone:
            dto.phone !== undefined
              ? dto.phone
              : user.phone,

          updatedAt:
            new Date().toISOString(),
        });

    if (!updatedUser) {
      throw new NotFoundException(
        'User tidak ditemukan',
      );
    }

    await this.auditLogService.create({
      userId: actorUserId,
      action: 'ADMIN_UPDATED',
      entity: 'User',
      entityId: id,
      description: 'Data administrator diperbarui',
      details:
        `Email: ${updatedUser.email} | ` +
        `Username: ${updatedUser.username ?? '-'} | ` +
        `Nama: ${updatedUser.fullName}`,
    });

    return {
      message:
        'Data administrator berhasil diperbarui',

      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        isActive: updatedUser.isActive,
      },
    };
  }

  async updateStatus(
    id: number,
    dto: UpdateAdminStatusDto,
    actorUserId: number,
  ) {
    const admin =
      await this.getAdminWithRoles(id);

    const isSuperAdmin =
      admin.roles.some(
        (role) => role.name === 'SUPER_ADMIN',
      );

    if (
      id === actorUserId &&
      !dto.isActive
    ) {
      throw new BadRequestException(
        'Anda tidak dapat menonaktifkan akun sendiri',
      );
    }

    if (
      isSuperAdmin &&
      !dto.isActive
    ) {
      const superAdminRole =
        await db.orm.public.Role
          .where({
            name: 'SUPER_ADMIN',
          })
          .first();

      if (!superAdminRole) {
        throw new NotFoundException(
          'Role SUPER_ADMIN tidak ditemukan',
        );
      }

      const superAdmins =
        await db.orm.public.UserRole
          .where({
            roleId: superAdminRole.id,
          })
          .all();

      const activeSuperAdmins =
        await Promise.all(
          superAdmins.map(
            async (userRole) => {
              const user =
                await db.orm.public.User
                  .where({
                    id: userRole.userId,
                  })
                  .first();

              return user?.isActive === true;
            },
          ),
        );

      const activeCount =
        activeSuperAdmins.filter(Boolean).length;

      if (activeCount <= 1) {
        throw new BadRequestException(
          'SUPER_ADMIN aktif terakhir tidak dapat dinonaktifkan',
        );
      }
    }

    const updatedUser =
      await db.orm.public.User
        .where({ id })
        .update({
          isActive: dto.isActive,
          updatedAt:
            new Date().toISOString(),
        });

    if (!updatedUser) {
      throw new NotFoundException(
        'User tidak ditemukan',
      );
    }

    // Jika akun dinonaktifkan,
    // refresh token langsung dicabut.
    if (!dto.isActive) {
      await db.orm.public.User
        .where({ id })
        .update({
          refreshTokenHash: null,
        });
    }

    await this.auditLogService.create({
      userId: actorUserId,
      action: dto.isActive
        ? 'ADMIN_ACTIVATED'
        : 'ADMIN_DEACTIVATED',
      entity: 'User',
      entityId: id,
      description: dto.isActive
        ? 'Akun administrator diaktifkan'
        : 'Akun administrator dinonaktifkan',
      details:
        `Nama: ${updatedUser.fullName} | ` +
        `Email: ${updatedUser.email}`,
    });

    return {
      message: dto.isActive
        ? 'Akun administrator berhasil diaktifkan'
        : 'Akun administrator berhasil dinonaktifkan',

      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        isActive: updatedUser.isActive,
      },
    };
  }

  async resetPassword(
    id: number,
    dto: ResetAdminPasswordDto,
    actorUserId: number,
  ) {
    const admin =
      await this.getAdminWithRoles(id);

    const passwordHash =
      await bcrypt.hash(dto.password, 12);

    await db.orm.public.User
      .where({ id })
      .update({
        passwordHash,
        refreshTokenHash: null,
        updatedAt:
          new Date().toISOString(),
      });

    await this.auditLogService.create({
      userId: actorUserId,
      action: 'ADMIN_PASSWORD_RESET',
      entity: 'User',
      entityId: id,
      description:
        'Password administrator direset oleh SUPER_ADMIN',
      details:
        `Nama: ${admin.user.fullName} | ` +
        `Email: ${admin.user.email}`,
    });

    return {
      message:
        'Password administrator berhasil direset',
    };
  }

  async updateRole(
    id: number,
    dto: UpdateAdminRoleDto,
    actorUserId: number,
  ) {
    const admin =
      await this.getAdminWithRoles(id);

    const currentSuperAdmin =
      admin.roles.some(
        (role) => role.name === 'SUPER_ADMIN',
      );

    if (
      id === actorUserId &&
      currentSuperAdmin &&
      dto.role !== 'SUPER_ADMIN'
    ) {
      throw new BadRequestException(
        'SUPER_ADMIN tidak dapat menurunkan role sendiri',
      );
    }

    if (
      currentSuperAdmin &&
      dto.role !== 'SUPER_ADMIN'
    ) {
      const superAdminRole =
        await db.orm.public.Role
          .where({
            name: 'SUPER_ADMIN',
          })
          .first();

      if (!superAdminRole) {
        throw new NotFoundException(
          'Role SUPER_ADMIN tidak ditemukan',
        );
      }

      const superAdmins =
        await db.orm.public.UserRole
          .where({
            roleId: superAdminRole.id,
          })
          .all();

      if (superAdmins.length <= 1) {
        throw new BadRequestException(
          'SUPER_ADMIN terakhir tidak dapat diturunkan rolenya',
        );
      }
    }

    const targetRole =
      await db.orm.public.Role
        .where({
          name: dto.role,
        })
        .first();

    if (!targetRole) {
      throw new NotFoundException(
        `Role ${dto.role} tidak ditemukan`,
      );
    }

    // Jika administrator sudah memiliki tepat satu
    // role administratif dan role tersebut sama dengan
    // role yang diminta, tidak ada perubahan yang perlu
    // dilakukan dan tidak perlu membuat audit perubahan.
    const adminRoleNames = [
      'ADMIN',
      'LIBRARIAN',
      'SUPER_ADMIN',
    ];

    const currentAdminRoles =
      admin.roles.filter((role) =>
        adminRoleNames.includes(role.name),
      );

    if (
      currentAdminRoles.length === 1 &&
      currentAdminRoles[0].name === dto.role
    ) {
      return {
        message:
          'Role administrator tidak berubah',
        role: {
          id: targetRole.id,
          name: targetRole.name,
          description:
            targetRole.description,
        },
      };
    }

    for (const currentRole of admin.roles) {
      if (
        adminRoleNames.includes(
          currentRole.name,
        ) &&
        currentRole.name !== dto.role
      ) {
        const userRole =
          await db.orm.public.UserRole
            .where({
              userId: id,
              roleId: currentRole.id,
            })
            .first();

        if (userRole) {
          await db.orm.public.UserRole
            .where({
              id: userRole.id,
            })
            .delete();
        }
      }
    }

    const existingTargetRole =
      await db.orm.public.UserRole
        .where({
          userId: id,
          roleId: targetRole.id,
        })
        .first();

    if (!existingTargetRole) {
      await db.orm.public.UserRole.create({
        userId: id,
        roleId: targetRole.id,
      });
    }

    await this.auditLogService.create({
      userId: actorUserId,
      action: 'ADMIN_ROLE_CHANGED',
      entity: 'User',
      entityId: id,
      description:
        'Role administrator diubah',
      details:
        `Nama: ${admin.user.fullName} | ` +
        `Role baru: ${dto.role}`,
    });

    return {
      message:
        'Role administrator berhasil diperbarui',
      role: {
        id: targetRole.id,
        name: targetRole.name,
        description:
          targetRole.description,
      },
    };
  }
}
