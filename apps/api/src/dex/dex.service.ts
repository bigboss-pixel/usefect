import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../prisma/db.js';

@Injectable()
export class DexService {
  async getPools() {
    return db.orm.public.DexPool.all();
  }

  async getPool(poolAddress: string) {
    const pool = await db.orm.public.DexPool.where({
      poolAddress,
    }).first();

    if (!pool) {
      throw new NotFoundException('DEX pool not found');
    }

    return pool;
  }

  async getActivities(limit = 50) {
    const transactions =
      await db.orm.public.DexTransaction.all();

    return transactions
      .sort((a, b) => {
        const slotA = BigInt(a.slot);
        const slotB = BigInt(b.slot);

        if (slotA === slotB) {
          return b.id - a.id;
        }

        return slotA > slotB ? -1 : 1;
      })
      .slice(0, limit);
  }

  async getIndexerState() {
    return db.orm.public.DexIndexerState.all();
  }
}
