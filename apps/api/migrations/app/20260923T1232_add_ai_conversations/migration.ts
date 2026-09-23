#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3e4310c77c1de57909870e14639bb23be17db494ff64daab678d353d12a40a32/contract';
import endContract from '../../snapshots/3e4310c77c1de57909870e14639bb23be17db494ff64daab678d353d12a40a32/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/41ab1435d1472e340447b4c406cedfb6fb5dfabb82527262251a50463f63123a/contract';
import startContract from '../../snapshots/41ab1435d1472e340447b4c406cedfb6fb5dfabb82527262251a50463f63123a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'aiConversation',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('model', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('provider', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('providerInteractionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'aiMessage',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('conversationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'aiMessageSource',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('messageId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('source', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'aiConversation',
        index: 'aiConversation_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'aiConversation',
        index: 'aiConversation_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'aiMessage',
        index: 'aiMessage_conversationId_idx_669215a6',
        columns: ['conversationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'aiMessage',
        index: 'aiMessage_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'aiMessageSource',
        index: 'aiMessageSource_messageId_idx_3cdded8d',
        columns: ['messageId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'aiConversation',
        foreignKey: {
          name: 'aiConversation_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'aiMessage',
        foreignKey: {
          name: 'aiMessage_conversationId_fkey',
          columns: ['conversationId'],
          references: { schema: 'public', table: 'aiConversation', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'aiMessageSource',
        foreignKey: {
          name: 'aiMessageSource_messageId_fkey',
          columns: ['messageId'],
          references: { schema: 'public', table: 'aiMessage', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
