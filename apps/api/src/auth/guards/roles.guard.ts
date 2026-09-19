import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { db } from '../../prisma/db.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(
        ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    // Jika endpoint tidak menggunakan @Roles()
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const user = request.user;

    // User harus sudah lolos JwtAuthGuard
    if (!user?.userId) {
      throw new ForbiddenException(
        'User tidak ditemukan',
      );
    }

    // Ambil semua role user dari database
    const userRoles = await db.orm.public.UserRole
      .where({
        userId: user.userId,
      })
      .all();

    // Jika user tidak memiliki role
    if (!userRoles || userRoles.length === 0) {
      throw new ForbiddenException(
        'User tidak memiliki role',
      );
    }

    // Ambil data role satu per satu
    const roleNames: string[] = [];

    for (const userRole of userRoles) {
      const role = await db.orm.public.Role
        .where({
          id: userRole.roleId,
        })
        .first();

      if (role) {
        roleNames.push(role.name);
      }
    }

    // Cek apakah user memiliki salah satu role
    const hasRequiredRole =
      requiredRoles.some((role) =>
        roleNames.includes(role),
      );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses ke halaman ini',
      );
    }

    return true;
  }
}