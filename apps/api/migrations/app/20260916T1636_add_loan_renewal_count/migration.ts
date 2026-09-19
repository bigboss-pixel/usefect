#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5de1855093b2eb511301cf26cd48c530b711cb098ff9e53ebde1ea1291a425d1/contract';
import endContract from '../../snapshots/5de1855093b2eb511301cf26cd48c530b711cb098ff9e53ebde1ea1291a425d1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/8d55cf1b607fc9d39b2b77e209ff5a16c956163ace2facf411a088908c17f500/contract';
import startContract from '../../snapshots/8d55cf1b607fc9d39b2b77e209ff5a16c956163ace2facf411a088908c17f500/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'loan',
        column: col('renewalCount', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
