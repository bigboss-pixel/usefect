import { Injectable } from '@nestjs/common';
import { db } from './prisma/db.js';

@Injectable()
export class HealthService {
  async check() {
    const startedAt = Date.now();

    try {
      await db.orm.public.User.first();

      return {
        status: 'ok',
        database: 'ok',
        timestamp: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
      };
    } catch {
      return {
        status: 'degraded',
        database: 'error',
        timestamp: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
      };
    }
  }
}
