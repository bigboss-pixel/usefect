#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/c473d3aa73816e5069d79919f8fda275ed061d1666b189185f7e2915479089ab/contract';
import endContract from '../../snapshots/c473d3aa73816e5069d79919f8fda275ed061d1666b189185f7e2915479089ab/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e4b16545ffa102a6caabccd646ae569c8f4b88d31150bc284c9fc10999545204/contract';
import startContract from '../../snapshots/e4b16545ffa102a6caabccd646ae569c8f4b88d31150bc284c9fc10999545204/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'eBook',
        column: col('aiRagAllowed', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'eBook',
        column: col('copyrightHolder', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'eBook',
        column: col('downloadAllowed', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'eBook',
        column: col('licenseType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'eBook',
        column: col('licenseUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'eBook',
        column: col('licenseVerifiedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'eBook',
        column: col('permissionEvidence', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'eBook',
        column: col('permissionGrantedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'eBook',
        column: col('permissionStatus', 'text', {
          notNull: true,
          default: lit('UNKNOWN'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'eBook',
        column: col('permissionVerifiedByUserId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'eBook',
        column: col('sourceUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'eBook',
        column: col('translationAllowed', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'eBook',
        index: 'eBook_permissionStatus_idx_babd62cb',
        columns: ['permissionStatus'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
