#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/38e6109e21b18853c7c7e42e7082f545216db56978a0eb2f5011788abfae9e78/contract';
import endContract from '../../snapshots/38e6109e21b18853c7c7e42e7082f545216db56978a0eb2f5011788abfae9e78/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b4bc47c43276c7a23d7d43dbc6ee48be44cda87f20ffaa75a9bcef4cb16f0f9d/contract';
import startContract from '../../snapshots/b4bc47c43276c7a23d7d43dbc6ee48be44cda87f20ffaa75a9bcef4cb16f0f9d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.setDefault({
        schema: 'public',
        table: 'loan',
        column: 'status',
        defaultSql: "DEFAULT 'PENDING'",
        operationClass: 'widening',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
