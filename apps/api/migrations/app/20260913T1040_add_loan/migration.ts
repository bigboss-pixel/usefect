#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/b4bc47c43276c7a23d7d43dbc6ee48be44cda87f20ffaa75a9bcef4cb16f0f9d/contract';
import endContract from '../../snapshots/b4bc47c43276c7a23d7d43dbc6ee48be44cda87f20ffaa75a9bcef4cb16f0f9d/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ecd49632b438334ad484f091a38019463e962a8fb9a47a451c7d9be7c56e8cc3/contract';
import startContract from '../../snapshots/ecd49632b438334ad484f091a38019463e962a8fb9a47a451c7d9be7c56e8cc3/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'loan',
        columns: [
          col('bookCopyId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('borrowedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('dueDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('returnedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'loan',
        index: 'loan_bookCopyId_idx_ab16ce78',
        columns: ['bookCopyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'loan',
        index: 'loan_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'loan',
        index: 'loan_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'loan',
        foreignKey: {
          name: 'loan_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'loan',
        foreignKey: {
          name: 'loan_bookCopyId_fkey',
          columns: ['bookCopyId'],
          references: { schema: 'public', table: 'bookCopy', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
