#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/c5eaf66ed05563fb6d0d9cfd0d818807a93890d9c28b372d9b7b6ac6c1af614b/contract';
import startContract from '../../snapshots/c5eaf66ed05563fb6d0d9cfd0d818807a93890d9c28b372d9b7b6ac6c1af614b/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e4b16545ffa102a6caabccd646ae569c8f4b88d31150bc284c9fc10999545204/contract';
import endContract from '../../snapshots/e4b16545ffa102a6caabccd646ae569c8f4b88d31150bc284c9fc10999545204/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'eBook',
        column: col('uploadedByUserId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'eBook',
        index: 'eBook_uploadedByUserId_idx_b9c62f4a',
        columns: ['uploadedByUserId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
