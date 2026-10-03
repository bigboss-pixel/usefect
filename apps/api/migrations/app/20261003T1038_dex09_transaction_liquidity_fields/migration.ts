#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/a865ad5f89664bc0fd397a8f3abc2bd54827ad4d00127a845757cc2d8d008dc1/contract';
import startContract from '../../snapshots/a865ad5f89664bc0fd397a8f3abc2bd54827ad4d00127a845757cc2d8d008dc1/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d5127ccaa8d40103655f5539f579e94b8a1c00e368792139e6d224d48fa88a37/contract';
import endContract from '../../snapshots/d5127ccaa8d40103655f5539f579e94b8a1c00e368792139e6d224d48fa88a37/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'dexTransaction',
        column: col('amountA', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'dexTransaction',
        column: col('amountB', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'dexTransaction',
        column: col('lpAmount', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'dexTransaction',
        column: col('lpMint', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'dexTransaction',
        column: col('tokenA', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'dexTransaction',
        column: col('tokenB', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
