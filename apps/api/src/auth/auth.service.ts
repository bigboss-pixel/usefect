import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service.js';
import * as bcrypt from 'bcrypt';

import { db } from '../prisma/db.js';

import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import {
  ForgotPasswordRequestDto,
  ForgotPasswordVerifyDto,
  ForgotPasswordResetDto,
} from './dto/forgot-password.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const {
      npm,
      email,
      password,
      fullName,
      phone,
      faculty,
      studyProgram,
      enrollmentYear,
    } = registerDto;

    const existingEmail = await db.orm.public.User
      .where({ email })
      .first();

    if (existingEmail) {
      throw new BadRequestException(
        'Email sudah terdaftar',
      );
    }

    const existingNpm = await db.orm.public.StudentProfile
      .where({ npm })
      .first();

    if (existingNpm) {
      throw new BadRequestException(
        'NPM sudah terdaftar',
      );
    }

    const passwordHash = await bcrypt.hash(
      password,
      10,
    );

    const user = await db.orm.public.User.create({
      email,
      passwordHash,
      fullName,
      username: null,
      phone: phone ?? null,
    });

    const studentRole = await db.orm.public.Role
      .where({ name: 'STUDENT' })
      .first();

    if (!studentRole) {
      throw new BadRequestException(
        'Role STUDENT tidak ditemukan',
      );
    }

    await db.orm.public.UserRole.create({
      userId: user.id,
      roleId: studentRole.id,
    });

    const studentProfile =
      await db.orm.public.StudentProfile.create({
        userId: user.id,
        npm,
        faculty: faculty ?? null,
        studyProgram: studyProgram ?? null,
        enrollmentYear:
          enrollmentYear ?? null,
      });

    return {
      message: 'Registrasi berhasil',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        studentProfile: {
          npm: studentProfile.npm,
          faculty: studentProfile.faculty,
          studyProgram: studentProfile.studyProgram,
          enrollmentYear:
            studentProfile.enrollmentYear,
        },
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { npm, password } = loginDto;

    const studentProfile =
      await db.orm.public.StudentProfile
        .where({ npm })
        .first();

    if (!studentProfile) {
      throw new UnauthorizedException(
        'NPM atau password salah',
      );
    }

    const user = await db.orm.public.User
      .where({ id: studentProfile.userId })
      .first();

    if (!user) {
      throw new UnauthorizedException(
        'NPM atau password salah',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Akun Anda tidak aktif',
      );
    }

    const isPasswordValid =
      await bcrypt.compare(
        password,
        user.passwordHash,
      );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'NPM atau password salah',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken =
      await this.jwtService.signAsync(
        payload,
        {
          secret: process.env['JWT_SECRET'],
          expiresIn:
            (process.env['JWT_EXPIRES_IN'] ??
              '1d') as any,
        },
      );

    const refreshToken =
      await this.jwtService.signAsync(
        payload,
        {
          secret:
            process.env['JWT_REFRESH_SECRET'],
          expiresIn:
            (process.env[
              'JWT_REFRESH_EXPIRES_IN'
            ] ?? '7d') as any,
        },
      );

    const refreshTokenHash =
      await bcrypt.hash(
        refreshToken,
        10,
      );

    await db.orm.public.User
      .where({ id: user.id })
      .update({
        refreshTokenHash,
      });

    return {
      message: 'Login berhasil',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        npm: studentProfile.npm,
        email: user.email,
        fullName: user.fullName,
      },
    };
  }

  async refreshTokens(
    refreshToken: string,
  ) {
    try {
      const payload =
        await this.jwtService.verifyAsync<{
          sub: number;
          email: string;
        }>(refreshToken, {
          secret:
            process.env['JWT_REFRESH_SECRET'],
        });

      const user = await db.orm.public.User
        .where({
          id: payload.sub,
        })
        .first();

      if (!user) {
        throw new UnauthorizedException(
          'User tidak ditemukan',
        );
      }

      if (!user.isActive) {
        throw new UnauthorizedException(
          'Akun Anda tidak aktif',
        );
      }

      if (!user.refreshTokenHash) {
        throw new UnauthorizedException(
          'Refresh token tidak valid',
        );
      }

      const isRefreshTokenValid =
        await bcrypt.compare(
          refreshToken,
          user.refreshTokenHash,
        );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException(
          'Refresh token tidak valid',
        );
      }

      const newPayload = {
        sub: user.id,
        email: user.email,
      };

      const accessToken =
        await this.jwtService.signAsync(
          newPayload,
          {
            secret:
              process.env['JWT_SECRET'],
            expiresIn:
              (process.env[
                'JWT_EXPIRES_IN'
              ] ?? '1d') as any,
          },
        );

      const newRefreshToken =
        await this.jwtService.signAsync(
          newPayload,
          {
            secret:
              process.env[
                'JWT_REFRESH_SECRET'
              ],
            expiresIn:
              (process.env[
                'JWT_REFRESH_EXPIRES_IN'
              ] ?? '7d') as any,
          },
        );

      const refreshTokenHash =
        await bcrypt.hash(
          newRefreshToken,
          10,
        );

      await db.orm.public.User
        .where({
          id: user.id,
        })
        .update({
          refreshTokenHash,
        });

      return {
        message:
          'Token berhasil diperbarui',
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      throw new UnauthorizedException(
        'Refresh token tidak valid atau sudah kedaluwarsa',
      );
    }
  }

  async logout(userId: number) {
    const user = await db.orm.public.User
      .where({ id: userId })
      .first();

    if (!user) {
      throw new UnauthorizedException(
        'User tidak ditemukan',
      );
    }

    await db.orm.public.User
      .where({ id: userId })
      .update({
        refreshTokenHash: null,
      });

    return {
      message: 'Logout berhasil',
    };
  }


  async requestPasswordReset(
    dto: ForgotPasswordRequestDto,
  ) {
    const npm = dto.npm.trim();

    const studentProfile =
      await db.orm.public.StudentProfile
        .where({ npm })
        .first();

    // Jangan membocorkan apakah NPM terdaftar.
    const genericResponse = {
      message:
        'Jika akun ditemukan, OTP telah dibuat. Silakan lanjutkan verifikasi.',
    };

    if (!studentProfile) {
      return genericResponse;
    }

    const user = await db.orm.public.User
      .where({ id: studentProfile.userId })
      .first();

    if (!user || !user.isActive) {
      return genericResponse;
    }

    // Batalkan penggunaan OTP lama yang masih aktif
    // agar hanya OTP terbaru yang berlaku.
    const previousResets =
      await db.orm.public.PasswordReset
        .where({ userId: user.id })
        .all();

    for (const previous of previousResets) {
      if (!previous.usedAt) {
        await db.orm.public.PasswordReset
          .where({ id: previous.id })
          .update({
            usedAt: new Date().toISOString(),
          });
      }
    }

    const otp = String(
      Math.floor(100000 + Math.random() * 900000),
    );

    const otpHash = await bcrypt.hash(otp, 10);

    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000,
    ).toISOString();

    await db.orm.public.PasswordReset.create({
      userId: user.id,
      otpHash,
      expiresAt,
      attempts: 0,
      usedAt: null,
    });

    await this.mailService.sendPasswordResetOtp(
      user.email,
      otp,
    );

    return genericResponse;
  }

  async verifyPasswordReset(
    dto: ForgotPasswordVerifyDto,
  ) {
    const npm = dto.npm.trim();

    const studentProfile =
      await db.orm.public.StudentProfile
        .where({ npm })
        .first();

    if (!studentProfile) {
      throw new BadRequestException(
        'OTP atau NPM tidak valid',
      );
    }

    const user = await db.orm.public.User
      .where({ id: studentProfile.userId })
      .first();

    if (!user || !user.isActive) {
      throw new BadRequestException(
        'OTP atau NPM tidak valid',
      );
    }

    const resets =
      await db.orm.public.PasswordReset
        .where({ userId: user.id })
        .all();

    const activeResets = resets
      .filter((reset) => !reset.usedAt)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );

    const reset = activeResets[0];

    if (!reset) {
      throw new BadRequestException(
        'OTP tidak ditemukan atau sudah digunakan',
      );
    }

    if (
      new Date(reset.expiresAt).getTime() <
      Date.now()
    ) {
      throw new BadRequestException(
        'OTP sudah kedaluwarsa',
      );
    }

    if (reset.attempts >= 5) {
      throw new BadRequestException(
        'Terlalu banyak percobaan OTP',
      );
    }

    const validOtp = await bcrypt.compare(
      dto.otp,
      reset.otpHash,
    );

    if (!validOtp) {
      await db.orm.public.PasswordReset
        .where({ id: reset.id })
        .update({
          attempts: reset.attempts + 1,
        });

      throw new BadRequestException(
        'OTP salah',
      );
    }

    const resetToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        resetId: reset.id,
        purpose: 'password-reset',
      },
      {
        secret: process.env['JWT_SECRET'],
        expiresIn: '10m',
      },
    );

    return {
      message: 'OTP berhasil diverifikasi',
      resetToken,
    };
  }

  async resetPassword(
    dto: ForgotPasswordResetDto,
  ) {
    let payload: {
      sub: number;
      resetId: number;
      purpose: string;
    };

    try {
      payload =
        await this.jwtService.verifyAsync<{
          sub: number;
          resetId: number;
          purpose: string;
        }>(dto.resetToken, {
          secret: process.env['JWT_SECRET'],
        });
    } catch {
      throw new BadRequestException(
        'Reset token tidak valid atau sudah kedaluwarsa',
      );
    }

    if (payload.purpose !== 'password-reset') {
      throw new BadRequestException(
        'Reset token tidak valid',
      );
    }

    const reset =
      await db.orm.public.PasswordReset
        .where({ id: payload.resetId })
        .first();

    if (!reset) {
      throw new BadRequestException(
        'Permintaan reset tidak ditemukan',
      );
    }

    if (reset.userId !== payload.sub) {
      throw new BadRequestException(
        'Reset token tidak valid',
      );
    }

    if (reset.usedAt) {
      throw new BadRequestException(
        'OTP sudah digunakan',
      );
    }

    if (
      new Date(reset.expiresAt).getTime() <
      Date.now()
    ) {
      throw new BadRequestException(
        'Permintaan reset sudah kedaluwarsa',
      );
    }

    const passwordHash = await bcrypt.hash(
      dto.newPassword,
      10,
    );

    await db.orm.public.User
      .where({ id: payload.sub })
      .update({
        passwordHash,
        refreshTokenHash: null,
      });

    await db.orm.public.PasswordReset
      .where({ id: reset.id })
      .update({
        usedAt: new Date().toISOString(),
      });

    return {
      message:
        'Password berhasil diubah. Silakan login kembali.',
    };
  }

  async me(userId: number) {
    const user = await db.orm.public.User
      .where({ id: userId })
      .first();

    if (!user) {
      throw new UnauthorizedException(
        'User tidak ditemukan',
      );
    }

    const userRoles =
      await db.orm.public.UserRole
        .where({ userId: user.id })
        .all();

    const roles: string[] = [];

    for (const userRole of userRoles) {
      const role =
        await db.orm.public.Role
          .where({ id: userRole.roleId })
          .first();

      if (role) {
        roles.push(role.name);
      }
    }

    const studentProfile =
      await db.orm.public.StudentProfile
        .where({ userId: user.id })
        .first();

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      username: user.username,
      phone: user.phone,
      isActive: user.isActive,
      roles,

      studentProfile: studentProfile
        ? {
            npm: studentProfile.npm,
            faculty: studentProfile.faculty,
            studyProgram:
              studentProfile.studyProgram,
            enrollmentYear:
              studentProfile.enrollmentYear,
          }
        : null,

      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
