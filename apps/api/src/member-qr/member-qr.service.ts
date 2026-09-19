import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { db } from '../prisma/db.js';

@Injectable()
export class MemberQrService {
  private getEncryptionKey(): Buffer {
    const value = process.env['QR_ENCRYPTION_KEY'] ?? '';
    const key = Buffer.from(value, 'hex');

    if (key.length !== 32) {
      throw new Error(
        'QR_ENCRYPTION_KEY harus berupa 64 karakter hexadecimal (32 byte)',
      );
    }

    return key;
  }

  private hashToken(token: string): string {
    return createHash('sha256')
      .update(token, 'utf8')
      .digest('hex');
  }

  private generateToken(): string {
    return `UMAQR1.${randomBytes(32).toString('base64url')}`;
  }

  private encryptToken(token: string): string {
    const key = this.getEncryptionKey();
    const iv = randomBytes(12);

    const cipher = createCipheriv(
      'aes-256-gcm',
      key,
      iv,
    );

    const encrypted = Buffer.concat([
      cipher.update(token, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64url'),
      authTag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  private decryptToken(encryptedValue: string): string {
    const parts = encryptedValue.split('.');

    if (parts.length !== 3) {
      throw new Error('Format encrypted QR token tidak valid');
    }

    const [ivValue, authTagValue, encryptedValueOnly] = parts;

    const key = this.getEncryptionKey();

    const iv = Buffer.from(ivValue, 'base64url');
    const authTag = Buffer.from(authTagValue, 'base64url');
    const encrypted = Buffer.from(
      encryptedValueOnly,
      'base64url',
    );

    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      iv,
    );

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  private async getMember(userId: number) {
    const user = await db.orm.public.User.where({
      id: userId,
    }).first();

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Akun tidak aktif');
    }

    const student = await db.orm.public.StudentProfile.where({
      userId,
    }).first();

    const lecturer = await db.orm.public.LecturerProfile.where({
      userId,
    }).first();

    if (!student && !lecturer) {
      throw new BadRequestException(
        'Akun ini tidak memiliki profil anggota perpustakaan',
      );
    }

    return {
      user,
      student,
      lecturer,
    };
  }

  private memberResponse(
    user: any,
    student: any,
    lecturer: any,
    token: string,
  ) {
    return {
      token,
      member: {
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        memberType: student ? 'STUDENT' : 'LECTURER',
        memberNumber:
          student?.npm ??
          lecturer?.lecturerNumber ??
          null,
        faculty:
          student?.faculty ??
          lecturer?.faculty ??
          null,
        studyProgram:
          student?.studyProgram ??
          lecturer?.studyProgram ??
          null,
        status: user.isActive
          ? 'ACTIVE'
          : 'INACTIVE',
      },
    };
  }

  async getOwnQr(userId: number) {
    const { user, student, lecturer } =
      await this.getMember(userId);

    const qr = await db.orm.public.MemberQr.where({
      userId,
    }).first();

    if (!qr || qr.revokedAt) {
      return this.generateOwnQr(userId);
    }

    if (!qr.tokenEncrypted) {
      return this.generateOwnQr(userId);
    }

    let token: string;

    try {
      token = this.decryptToken(qr.tokenEncrypted);
    } catch {
      throw new BadRequestException(
        'QR anggota tidak dapat dibaca. Silakan generate ulang.',
      );
    }

    return this.memberResponse(
      user,
      student,
      lecturer,
      token,
    );
  }

  async generateOwnQr(userId: number) {
    const { user, student, lecturer } =
      await this.getMember(userId);

    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const tokenEncrypted =
      this.encryptToken(token);

    const existing =
      await db.orm.public.MemberQr.where({
        userId,
      }).first();

    let qr;

    if (existing) {
      qr = await db.orm.public.MemberQr
        .where({ id: existing.id })
        .update({
          tokenHash,
          tokenEncrypted,
          revokedAt: null,
          updatedAt: new Date().toISOString(),
        });
    } else {
      qr = await db.orm.public.MemberQr.create({
        userId,
        tokenHash,
        tokenEncrypted,
        revokedAt: null,
      });
    }

    if (!qr) {
      throw new BadRequestException(
        'Gagal membuat QR anggota',
      );
    }

    return this.memberResponse(
      user,
      student,
      lecturer,
      token,
    );
  }

  async validateQr(token: string) {
    if (!token.startsWith('UMAQR1.')) {
      throw new BadRequestException(
        'Format QR anggota tidak valid',
      );
    }

    const tokenHash = this.hashToken(token);

    const qr =
      await db.orm.public.MemberQr.where({
        tokenHash,
      }).first();

    if (!qr) {
      throw new NotFoundException(
        'QR anggota tidak ditemukan',
      );
    }

    if (qr.revokedAt) {
      throw new ForbiddenException(
        'QR anggota sudah tidak berlaku',
      );
    }

    const { user, student, lecturer } =
      await this.getMember(qr.userId);

    return {
      valid: true,
      member: {
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        memberType: student
          ? 'STUDENT'
          : 'LECTURER',
        memberNumber:
          student?.npm ??
          lecturer?.lecturerNumber ??
          null,
        faculty:
          student?.faculty ??
          lecturer?.faculty ??
          null,
        studyProgram:
          student?.studyProgram ??
          lecturer?.studyProgram ??
          null,
        status: 'ACTIVE',
      },
    };
  }

  async revokeOwnQr(userId: number) {
    const existing =
      await db.orm.public.MemberQr.where({
        userId,
      }).first();

    if (!existing) {
      throw new NotFoundException(
        'QR anggota belum dibuat',
      );
    }

    await db.orm.public.MemberQr
      .where({ id: existing.id })
      .update({
        revokedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    return {
      message: 'QR anggota berhasil direvoke',
    };
  }
}
