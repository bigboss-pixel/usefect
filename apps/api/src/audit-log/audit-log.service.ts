import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';

export interface CreateAuditLogInput {
  userId?: number | null;
  action: string;
  entity: string;
  entityId?: number | null;
  description?: string | null;
  details?: string | null;
}

@Injectable()
export class AuditLogService {
  async create(input: CreateAuditLogInput) {
    return db.orm.public.AuditLog.create({
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      description: input.description ?? null,
      details: input.details ?? null,
    });
  }

  async list(options?: {
    userId?: number;
    action?: string;
    entity?: string;
    entityId?: number;
    limit?: number;
  }) {
    const logs = await db.orm.public.AuditLog.all();

    return logs
      .filter((log) => {
        if (options?.userId !== undefined && log.userId !== options.userId) {
          return false;
        }

        if (options?.action !== undefined && log.action !== options.action) {
          return false;
        }

        if (options?.entity !== undefined && log.entity !== options.entity) {
          return false;
        }

        if (
          options?.entityId !== undefined &&
          log.entityId !== options.entityId
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      )
      .slice(0, options?.limit ?? 100);
  }
}
