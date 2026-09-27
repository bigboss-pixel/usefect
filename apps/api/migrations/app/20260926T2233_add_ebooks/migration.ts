#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3e4310c77c1de57909870e14639bb23be17db494ff64daab678d353d12a40a32/contract';
import startContract from '../../snapshots/3e4310c77c1de57909870e14639bb23be17db494ff64daab678d353d12a40a32/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c5eaf66ed05563fb6d0d9cfd0d818807a93890d9c28b372d9b7b6ac6c1af614b/contract';
import endContract from '../../snapshots/c5eaf66ed05563fb6d0d9cfd0d818807a93890d9c28b372d9b7b6ac6c1af614b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'eBook',
        columns: [
          col('accessType', 'text', {
            notNull: true,
            default: lit('READ_ONLY'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('author', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('category', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('coverUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fileType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fileUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isbn', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('language', 'text', {
            notNull: true,
            default: lit('Indonesia'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('license', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('publicationYear', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('publisher', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('source', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'eBook',
        constraint: 'eBook_isbn_key',
        columns: ['isbn'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'eBook',
        index: 'eBook_author_idx_d6f5b826',
        columns: ['author'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'eBook',
        index: 'eBook_category_idx_f2600f8e',
        columns: ['category'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'eBook',
        index: 'eBook_language_idx_28a6f524',
        columns: ['language'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'eBook',
        index: 'eBook_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'eBook',
        index: 'eBook_title_idx_1c94c7b6',
        columns: ['title'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
