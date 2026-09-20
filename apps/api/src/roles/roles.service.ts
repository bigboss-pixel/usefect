import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { db } from '../prisma/db.js';

import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { AssignPermissionDto } from './dto/assign-permission.dto.js';

@Injectable()
export class RolesService {
  async create(
    createRoleDto: CreateRoleDto,
  ) {
    const {
      name,
      description,
    } = createRoleDto;

    const normalizedName =
      name.trim().toUpperCase();

    // Cek apakah nama role sudah digunakan
    const existingRole =
      await db.orm.public.Role
        .where({
          name: normalizedName,
        })
        .first();

    if (existingRole) {
      throw new BadRequestException(
        'Nama role sudah digunakan',
      );
    }

    const role =
      await db.orm.public.Role
        .create({
          name: normalizedName,
          description:
            description ?? null,
        });

    return {
      message:
        'Role berhasil dibuat',

      role: {
        id: role.id,
        name: role.name,
        description:
          role.description,
        createdAt:
          role.createdAt,
        updatedAt:
          role.updatedAt,
      },
    };
  }

  async findAll() {
    const roles =
      await db.orm.public.Role
        .all();

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description:
        role.description,
      createdAt:
        role.createdAt,
      updatedAt:
        role.updatedAt,
    }));
  }

  async findOne(id: number) {
    const role =
      await db.orm.public.Role
        .where({ id })
        .first();

    if (!role) {
      throw new NotFoundException(
        'Role tidak ditemukan',
      );
    }

    return {
      id: role.id,
      name: role.name,
      description:
        role.description,
      createdAt:
        role.createdAt,
      updatedAt:
        role.updatedAt,
    };
  }

  async update(
    id: number,
    updateRoleDto: UpdateRoleDto,
  ) {
    const role =
      await db.orm.public.Role
        .where({ id })
        .first();

    if (!role) {
      throw new NotFoundException(
        'Role tidak ditemukan',
      );
    }

    const {
      name,
      description,
    } = updateRoleDto;

    let normalizedName = role.name;

    // Jika nama diubah
    if (
      name !== undefined &&
      name.trim().toUpperCase() !==
        role.name
    ) {
      normalizedName =
        name.trim().toUpperCase();

      const existingRole =
        await db.orm.public.Role
          .where({
            name: normalizedName,
          })
          .first();

      if (existingRole) {
        throw new BadRequestException(
          'Nama role sudah digunakan',
        );
      }
    }

    const updatedRole =
      await db.orm.public.Role
        .where({ id })
        .update({
          name: normalizedName,

          description:
            description !== undefined
              ? description
              : role.description,

          updatedAt:
            new Date().toISOString(),
        });

    if (!updatedRole) {
      throw new NotFoundException(
        'Role tidak ditemukan',
      );
    }

    return {
      message:
        'Role berhasil diperbarui',

      role: {
        id: updatedRole.id,
        name: updatedRole.name,
        description:
          updatedRole.description,
        createdAt:
          updatedRole.createdAt,
        updatedAt:
          updatedRole.updatedAt,
      },
    };
  }

  async assignPermission(
    roleId: number,
    assignPermissionDto: AssignPermissionDto,
  ) {
    const { permissionId } =
      assignPermissionDto;

    // Cek role
    const role =
      await db.orm.public.Role
        .where({ id: roleId })
        .first();

    if (!role) {
      throw new NotFoundException(
        'Role tidak ditemukan',
      );
    }

    // Cek permission
    const permission =
      await db.orm.public.Permission
        .where({ id: permissionId })
        .first();

    if (!permission) {
      throw new NotFoundException(
        'Permission tidak ditemukan',
      );
    }

    // Cek apakah permission sudah dimiliki role
    const existingRolePermission =
      await db.orm.public.RolePermission
        .where({
          roleId,
          permissionId,
        })
        .first();

    if (existingRolePermission) {
      throw new BadRequestException(
        'Permission sudah dimiliki oleh role ini',
      );
    }

    // Assign permission ke role
    const rolePermission =
      await db.orm.public.RolePermission
        .create({
          roleId,
          permissionId,
        });

    return {
      message:
        'Permission berhasil ditambahkan ke role',

      rolePermission: {
        id: rolePermission.id,
        roleId: rolePermission.roleId,
        permissionId:
          rolePermission.permissionId,
        createdAt:
          rolePermission.createdAt,
      },
    };
  }

  async getPermissions(roleId: number) {
    // Cek role
    const role =
      await db.orm.public.Role
        .where({ id: roleId })
        .first();

    if (!role) {
      throw new NotFoundException(
        'Role tidak ditemukan',
      );
    }

    const rolePermissions =
      await db.orm.public.RolePermission
        .where({ roleId })
        .all();

    const permissions = [];

    for (const rolePermission of rolePermissions) {
      const permission =
        await db.orm.public.Permission
          .where({
            id: rolePermission.permissionId,
          })
          .first();

      if (permission) {
        permissions.push({
          id: permission.id,
          code: permission.code,
          description:
            permission.description,
          createdAt:
            permission.createdAt,
          updatedAt:
            permission.updatedAt,
        });
      }
    }

    return {
      role: {
        id: role.id,
        name: role.name,
        description:
          role.description,
      },

      permissions,
    };
  }

  async removePermission(
    roleId: number,
    permissionId: number,
  ) {
    // Cek role
    const role =
      await db.orm.public.Role
        .where({ id: roleId })
        .first();

    if (!role) {
      throw new NotFoundException(
        'Role tidak ditemukan',
      );
    }

    // Cek permission
    const permission =
      await db.orm.public.Permission
        .where({ id: permissionId })
        .first();

    if (!permission) {
      throw new NotFoundException(
        'Permission tidak ditemukan',
      );
    }

    // Cari hubungan role-permission
    const rolePermission =
      await db.orm.public.RolePermission
        .where({
          roleId,
          permissionId,
        })
        .first();

    if (!rolePermission) {
      throw new NotFoundException(
        'Permission tidak dimiliki oleh role ini',
      );
    }

    await db.orm.public.RolePermission
      .where({
        id: rolePermission.id,
      })
      .delete();

    return {
      message:
        'Permission berhasil dihapus dari role',
    };
  }

      async remove(id: number) {
  const role =
    await db.orm.public.Role
      .where({ id })
      .first();

  if (!role) {
    throw new NotFoundException(
      'Role tidak ditemukan',
    );
  }

  // Lindungi role sistem
  const systemRoles = [
    'SUPER_ADMIN',
    'ADMIN',
    'LIBRARIAN',
    'STUDENT',
    'LECTURER',
    'PUBLIC',
  ];

  if (systemRoles.includes(role.name)) {
    throw new BadRequestException(
      'Role sistem tidak dapat dihapus',
    );
  }

  // Cek apakah role masih digunakan oleh user
  const userRoles =
    await db.orm.public.UserRole
      .where({ roleId: id })
      .all();

  if (userRoles.length > 0) {
    throw new BadRequestException(
      'Role masih digunakan oleh user dan tidak dapat dihapus',
    );
  }

  // Hapus role
  await db.orm.public.Role
    .where({ id })
    .delete();

  return {
    message:
      'Role berhasil dihapus',
  };
}
}
