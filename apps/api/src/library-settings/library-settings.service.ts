import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { db } from '../prisma/db.js';

import { UpdateLibrarySettingsDto } from './dto/update-library-settings.dto.js';

@Injectable()
export class LibrarySettingsService {

  private async getSettings() {
    const settings =
      await db.orm.public.LibrarySetting.first();

    if (!settings) {
      throw new InternalServerErrorException(
        'Konfigurasi perpustakaan belum tersedia',
      );
    }

    return settings;
  }

  async get() {
    return this.getSettings();
  }

  async update(
    dto: UpdateLibrarySettingsDto,
  ) {
    const fields = [
      'maxActiveLoans',
      'loanDurationDays',
      'maxRenewals',
      'renewalDurationDays',
      'finePerDay',
      'reservationExpiryHours',
    ] as const;

    for (const field of fields) {
      const value = dto[field];

      if (value !== undefined) {
        if (
          !Number.isInteger(value) ||
          value < 0
        ) {
          throw new BadRequestException(
            `${field} harus berupa bilangan bulat >= 0`,
          );
        }
      }
    }

    if (
      dto.maxActiveLoans !== undefined &&
      dto.maxActiveLoans < 1
    ) {
      throw new BadRequestException(
        'Maksimal buku dipinjam harus minimal 1',
      );
    }

    if (
      dto.loanDurationDays !== undefined &&
      dto.loanDurationDays < 1
    ) {
      throw new BadRequestException(
        'Durasi peminjaman harus minimal 1 hari',
      );
    }

    if (
      dto.maxRenewals !== undefined &&
      dto.maxRenewals < 0
    ) {
      throw new BadRequestException(
        'Maksimal renewal tidak boleh negatif',
      );
    }

    if (
      dto.renewalDurationDays !== undefined &&
      dto.renewalDurationDays < 1
    ) {
      throw new BadRequestException(
        'Durasi renewal harus minimal 1 hari',
      );
    }

    if (
      dto.reservationExpiryHours !== undefined &&
      dto.reservationExpiryHours < 1
    ) {
      throw new BadRequestException(
        'Masa berlaku reservation harus minimal 1 jam',
      );
    }

    const current =
      await this.getSettings();

    const updated =
      await db.orm.public.LibrarySetting
        .where({
          id: current.id,
        })
        .update({
          ...(dto.maxActiveLoans !== undefined
            ? {
                maxActiveLoans:
                  dto.maxActiveLoans,
              }
            : {}),

          ...(dto.loanDurationDays !== undefined
            ? {
                loanDurationDays:
                  dto.loanDurationDays,
              }
            : {}),

          ...(dto.maxRenewals !== undefined
            ? {
                maxRenewals:
                  dto.maxRenewals,
              }
            : {}),

          ...(dto.renewalDurationDays !== undefined
            ? {
                renewalDurationDays:
                  dto.renewalDurationDays,
              }
            : {}),

          ...(dto.finePerDay !== undefined
            ? {
                finePerDay:
                  dto.finePerDay,
              }
            : {}),

          ...(dto.reservationExpiryHours !== undefined
            ? {
                reservationExpiryHours:
                  dto.reservationExpiryHours,
              }
            : {}),

          updatedAt:
            new Date().toISOString(),
        });

    if (!updated) {
      throw new InternalServerErrorException(
        'Konfigurasi perpustakaan gagal diperbarui',
      );
    }

    return {
      message:
        'Konfigurasi perpustakaan berhasil diperbarui',
      settings:
        await this.getSettings(),
    };
  }

  async getMaxActiveLoans() {
    const settings =
      await this.getSettings();

    return settings.maxActiveLoans;
  }

  async getLoanDurationDays() {
    const settings =
      await this.getSettings();

    return settings.loanDurationDays;
  }

  async getMaxRenewals() {
    const settings =
      await this.getSettings();

    return settings.maxRenewals;
  }

  async getRenewalDurationDays() {
    const settings =
      await this.getSettings();

    return settings.renewalDurationDays;
  }

  async getFinePerDay() {
    const settings =
      await this.getSettings();

    return settings.finePerDay;
  }

  async getReservationExpiryHours() {
    const settings =
      await this.getSettings();

    return settings.reservationExpiryHours;
  }
}
