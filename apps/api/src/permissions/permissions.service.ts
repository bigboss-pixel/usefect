import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { db } from '../prisma/db.js';

import { CreatePermissionDto } from './dto/create-permission.dto.js';
import { UpdatePermissionDto } from './dto/update-permission.dto.js';

@Injectable()
export class PermissionsService {
  async create(
    createPermissionDto: CreatePermissionDto,
  ) {
    const {
      code,
      description,
    } = createPermissionDto;

    // Cek apakah code permission sudah digunakan
    const existingPermission =
      await db.orm.public.Permission
        .where({ code })
        .first();

    if (existingPermission) {
      throw new BadRequestException(
        'Code permission sudah digunakan',
      );
    }

    // Buat permission
    const permission =
      await db.orm.public.Permission
        .create({
          code,
          description:
            description ?? null,
        });

    return {
      message:
        'Permission berhasil dibuat',

      permission: {
        id: permission.id,
        code: permission.code,
        description:
          permission.description,
        createdAt:
          permission.createdAt,
        updatedAt:
          permission.updatedAt,
      },
    };
  }

  async findAll() {
    const permissions =
      await db.orm.public.Permission
        .all();

    return permissions.map((permission) => ({
      id: permission.id,
      code: permission.code,
      description:
        permission.description,
      createdAt:
        permission.createdAt,
      updatedAt:
        permission.updatedAt,
    }));
  }

  async findOne(id: number) {
    const permission =
      await db.orm.public.Permission
        .where({ id })
        .first();

    if (!permission) {
      throw new NotFoundException(
        'Permission tidak ditemukan',
      );
    }

    return {
      id: permission.id,
      code: permission.code,
      description:
        permission.description,
      createdAt:
        permission.createdAt,
      updatedAt:
        permission.updatedAt,
    };
  }

  async update(
    id: number,
    updatePermissionDto: UpdatePermissionDto,
  ) {
    // Cari permission
    const permission =
      await db.orm.public.Permission
        .where({ id })
        .first();

    if (!permission) {
      throw new NotFoundException(
        'Permission tidak ditemukan',
      );
    }

    const {
      code,
      description,
    } = updatePermissionDto;

    // Cek code jika ingin diubah
    if (
      code !== undefined &&
      code !== permission.code
    ) {
      const existingPermission =
        await db.orm.public.Permission
          .where({ code })
          .first();

      if (existingPermission) {
        throw new BadRequestException(
          'Code permission sudah digunakan',
        );
      }
    }

    const updatedPermission =
      await db.orm.public.Permission
        .where({ id })
        .update({
          code:
            code !== undefined
              ? code
              : permission.code,

          description:
            description !== undefined
              ? description
              : permission.description,

          updatedAt:
            new Date().toISOString(),
        });

    if (!updatedPermission) {
      throw new NotFoundException(
        'Permission tidak ditemukan',
      );
    }

    return {
      message:
        'Permission berhasil diperbarui',

      permission: {
        id: updatedPermission.id,
        code: updatedPermission.code,
        description:
          updatedPermission.description,
        createdAt:
          updatedPermission.createdAt,
        updatedAt:
          updatedPermission.updatedAt,
      },
    };
  }

  async remove(id: number) {
    const permission =
      await db.orm.public.Permission
        .where({ id })
        .first();

    if (!permission) {
      throw new NotFoundException(
        'Permission tidak ditemukan',
      );
    }

    // Cek apakah permission masih digunakan role
    const rolePermissions =
      await db.orm.public.RolePermission
        .where({
          permissionId: id,
        })
        .all();

    if (rolePermissions.length > 0) {
      throw new BadRequestException(
        'Permission masih digunakan oleh role dan tidak dapat dihapus',
      );
    }

    await db.orm.public.Permission
      .where({ id })
      .delete();

    return {
      message:
        'Permission berhasil dihapus',
    };
  }
  
}
