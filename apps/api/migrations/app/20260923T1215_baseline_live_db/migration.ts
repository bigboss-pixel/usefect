#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/41ab1435d1472e340447b4c406cedfb6fb5dfabb82527262251a50463f63123a/contract';
import endContract from '../../snapshots/41ab1435d1472e340447b4c406cedfb6fb5dfabb82527262251a50463f63123a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'auditLog',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('details', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('entity', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('entityId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('userId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'book',
        columns: [
          col('author', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('categoryId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isbn', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('publicationYear', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('publisher', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'bookCopy',
        columns: [
          col('barcode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('bookId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('homeLocation', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('shelfLocation', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('AVAILABLE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'category',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'lecturerProfile',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('faculty', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lecturerNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('studyProgram', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'librarySetting',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('finePerDay', 'int4', {
            notNull: true,
            default: lit(1000),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('loanDurationDays', 'int4', {
            notNull: true,
            default: lit(7),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('maxActiveLoans', 'int4', {
            notNull: true,
            default: lit(3),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('maxRenewals', 'int4', {
            notNull: true,
            default: lit(2),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('renewalDurationDays', 'int4', {
            notNull: true,
            default: lit(7),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('reservationExpiryHours', 'int4', {
            notNull: true,
            default: lit(24),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
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
          col('fineAmount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('renewalCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('reservationId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('returnRequestStatus', 'text', {
            notNull: true,
            default: lit('NONE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('returnRequestedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('returnedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
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
      this.createTable({
        schema: 'public',
        table: 'memberQr',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('revokedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('tokenEncrypted', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'notification',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isRead', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('message', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'passwordReset',
        columns: [
          col('attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('otpHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('usedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'permission',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'reservation',
        columns: [
          col('approvedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('bookId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('cancelledAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('pickedUpAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
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
      this.createTable({
        schema: 'public',
        table: 'role',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'rolePermission',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('permissionId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('roleId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'studentProfile',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('enrollmentYear', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('faculty', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('npm', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('studyProgram', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('fullName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('refreshTokenHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('username', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'userRole',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('roleId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'book',
        constraint: 'book_isbn_key',
        columns: ['isbn'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'bookCopy',
        constraint: 'bookCopy_barcode_key',
        columns: ['barcode'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'category',
        constraint: 'category_name_key',
        columns: ['name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'lecturerProfile',
        constraint: 'lecturerProfile_userId_key',
        columns: ['userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'lecturerProfile',
        constraint: 'lecturerProfile_lecturerNumber_key',
        columns: ['lecturerNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'loan',
        constraint: 'loan_reservationId_key',
        columns: ['reservationId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'memberQr',
        constraint: 'memberQr_userId_key',
        columns: ['userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'memberQr',
        constraint: 'memberQr_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'permission',
        constraint: 'permission_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'role',
        constraint: 'role_name_key',
        columns: ['name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'rolePermission',
        constraint: 'rolePermission_roleId_permissionId_key',
        columns: ['roleId', 'permissionId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'studentProfile',
        constraint: 'studentProfile_userId_key',
        columns: ['userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'studentProfile',
        constraint: 'studentProfile_npm_key',
        columns: ['npm'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_username_key',
        columns: ['username'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'userRole',
        constraint: 'userRole_userId_roleId_key',
        columns: ['userId', 'roleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_action_idx_cd0d2116',
        columns: ['action'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_entityId_idx_18814ca5',
        columns: ['entityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_entity_idx_9d26d53c',
        columns: ['entity'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'book',
        index: 'book_categoryId_idx_15c304f2',
        columns: ['categoryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'bookCopy',
        index: 'bookCopy_bookId_idx_3eec38a3',
        columns: ['bookId'],
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
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_isRead_idx_a2737ae3',
        columns: ['isRead'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'passwordReset',
        index: 'passwordReset_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'passwordReset',
        index: 'passwordReset_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'reservation',
        index: 'reservation_bookId_idx_3eec38a3',
        columns: ['bookId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'reservation',
        index: 'reservation_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'reservation',
        index: 'reservation_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'rolePermission',
        index: 'rolePermission_permissionId_idx_f46fcdf5',
        columns: ['permissionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'rolePermission',
        index: 'rolePermission_roleId_idx_ffccc9a4',
        columns: ['roleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'userRole',
        index: 'userRole_roleId_idx_ffccc9a4',
        columns: ['roleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'userRole',
        index: 'userRole_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'auditLog',
        foreignKey: {
          name: 'auditLog_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'book',
        foreignKey: {
          name: 'book_categoryId_fkey',
          columns: ['categoryId'],
          references: { schema: 'public', table: 'category', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'bookCopy',
        foreignKey: {
          name: 'bookCopy_bookId_fkey',
          columns: ['bookId'],
          references: { schema: 'public', table: 'book', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'lecturerProfile',
        foreignKey: {
          name: 'lecturerProfile_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
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
      this.addForeignKey({
        schema: 'public',
        table: 'loan',
        foreignKey: {
          name: 'loan_reservationId_fkey',
          columns: ['reservationId'],
          references: { schema: 'public', table: 'reservation', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'memberQr',
        foreignKey: {
          name: 'memberQr_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notification',
        foreignKey: {
          name: 'notification_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'passwordReset',
        foreignKey: {
          name: 'passwordReset_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'reservation',
        foreignKey: {
          name: 'reservation_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'reservation',
        foreignKey: {
          name: 'reservation_bookId_fkey',
          columns: ['bookId'],
          references: { schema: 'public', table: 'book', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'rolePermission',
        foreignKey: {
          name: 'rolePermission_roleId_fkey',
          columns: ['roleId'],
          references: { schema: 'public', table: 'role', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'rolePermission',
        foreignKey: {
          name: 'rolePermission_permissionId_fkey',
          columns: ['permissionId'],
          references: { schema: 'public', table: 'permission', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'studentProfile',
        foreignKey: {
          name: 'studentProfile_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'userRole',
        foreignKey: {
          name: 'userRole_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'userRole',
        foreignKey: {
          name: 'userRole_roleId_fkey',
          columns: ['roleId'],
          references: { schema: 'public', table: 'role', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
