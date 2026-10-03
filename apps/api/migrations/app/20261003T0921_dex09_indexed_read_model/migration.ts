#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/a865ad5f89664bc0fd397a8f3abc2bd54827ad4d00127a845757cc2d8d008dc1/contract';
import endContract from '../../snapshots/a865ad5f89664bc0fd397a8f3abc2bd54827ad4d00127a845757cc2d8d008dc1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c473d3aa73816e5069d79919f8fda275ed061d1666b189185f7e2915479089ab/contract';
import startContract from '../../snapshots/c473d3aa73816e5069d79919f8fda275ed061d1666b189185f7e2915479089ab/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'dexIndexerState',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lastProcessedSignature', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('lastProcessedSlot', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('network', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('programId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'dexPool',
        columns: [
          col('blockTime', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('dexAddress', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('feeBps', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lpMint', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lpSupply', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('poolAddress', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reserveA', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reserveB', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('slot', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tokenA', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tokenADecimals', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tokenB', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tokenBDecimals', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('vaultA', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('vaultB', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'dexTransaction',
        columns: [
          col('amountIn', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('amountOut', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('blockTime', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('poolAddress', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('poolId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('signature', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('slot', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tokenIn', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tokenOut', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userAddress', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'dexIndexerState',
        constraint: 'dexIndexerState_programId_key',
        columns: ['programId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'dexPool',
        constraint: 'dexPool_poolAddress_key',
        columns: ['poolAddress'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'dexTransaction',
        constraint: 'dexTransaction_signature_key',
        columns: ['signature'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dexPool',
        index: 'dexPool_slot_idx_c5200595',
        columns: ['slot'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dexPool',
        index: 'dexPool_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dexPool',
        index: 'dexPool_tokenA_tokenB_idx_352f51d3',
        columns: ['tokenA', 'tokenB'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dexPool',
        index: 'dexPool_updatedAt_idx_8c508b31',
        columns: ['updatedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dexTransaction',
        index: 'dexTransaction_blockTime_idx_6e83d95b',
        columns: ['blockTime'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dexTransaction',
        index: 'dexTransaction_poolAddress_idx_77694a02',
        columns: ['poolAddress'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dexTransaction',
        index: 'dexTransaction_poolId_idx_d8a048f6',
        columns: ['poolId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dexTransaction',
        index: 'dexTransaction_slot_idx_c5200595',
        columns: ['slot'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dexTransaction',
        index: 'dexTransaction_type_idx_b6b604ea',
        columns: ['type'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dexTransaction',
        index: 'dexTransaction_userAddress_idx_3f459b97',
        columns: ['userAddress'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'dexTransaction',
        foreignKey: {
          name: 'dexTransaction_poolId_fkey',
          columns: ['poolId'],
          references: { schema: 'public', table: 'dexPool', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
