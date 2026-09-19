import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { db } from '../../prisma/db.js';
import {
  PERMISSIONS_KEY,
} from '../decorators/permissions.decorator.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    // Jika endpoint tidak menggunakan @Permissions()
    if (
      !requiredPermissions ||
      requiredPermissions.length === 0
    ) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest();

    const user = request.user;

    // Pastikan user sudah login
    if (!user?.userId) {
      throw new ForbiddenException(
        'User tidak ditemukan',
      );
    }

    // Ambil semua role user
    const userRoles =
      await db.orm.public.UserRole
        .where({
          userId: user.userId,
        })
        .all();

    const permissionCodes: string[] = [];

    // Loop semua role user
    for (const userRole of userRoles) {
      // Ambil permission dari role
      const rolePermissions =
        await db.orm.public.RolePermission
          .where({
            roleId: userRole.roleId,
          })
          .all();

      // Loop semua permission role
      for (
        const rolePermission of rolePermissions
      ) {
        const permission =
          await db.orm.public.Permission
            .where({
              id: rolePermission.permissionId,
            })
            .first();

        if (permission) {
          permissionCodes.push(
            permission.code,
          );
        }
      }
    }

    // Cek apakah user memiliki
    // minimal satu permission yang dibutuhkan
    const hasPermission =
      requiredPermissions.some(
        (permission) =>
          permissionCodes.includes(permission),
      );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Anda tidak memiliki permission untuk mengakses halaman ini',
      );
    }

    return true;
  }
}