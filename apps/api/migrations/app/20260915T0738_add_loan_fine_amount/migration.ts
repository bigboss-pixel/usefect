#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/38e6109e21b18853c7c7e42e7082f545216db56978a0eb2f5011788abfae9e78/contract';
import startContract from '../../snapshots/38e6109e21b18853c7c7e42e7082f545216db56978a0eb2f5011788abfae9e78/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/8d55cf1b607fc9d39b2b77e209ff5a16c956163ace2facf411a088908c17f500/contract';
import endContract from '../../snapshots/8d55cf1b607fc9d39b2b77e209ff5a16c956163ace2facf411a088908c17f500/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'loan',
        column: col('fineAmount', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
