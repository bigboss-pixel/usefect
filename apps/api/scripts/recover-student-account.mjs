import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import * as bcrypt from 'bcrypt';
import { db } from '../dist/prisma/db.js';

const rl = createInterface({ input, output });

try {
  const npm = (await rl.question('NPM: ')).trim();

  if (!npm) {
    throw new Error('NPM tidak boleh kosong.');
  }

  const studentProfile =
    await db.orm.public.StudentProfile
      .where({ npm })
      .first();

  if (!studentProfile) {
    throw new Error('NPM tidak ditemukan.');
  }

  const user =
    await db.orm.public.User
      .where({ id: studentProfile.userId })
      .first();

  if (!user) {
    throw new Error('User pemilik NPM tidak ditemukan.');
  }

  const email = (
    await rl.question('Email baru: ')
  ).trim();

  if (!email) {
    throw new Error('Email tidak boleh kosong.');
  }

  const phone = (
    await rl.question('Nomor HP baru: ')
  ).trim();

  const password = (
    await rl.question('Password baru: ')
  ).trim();

  if (password.length < 8) {
    throw new Error(
      'Password minimal 8 karakter.',
    );
  }

  const confirmPassword = (
    await rl.question('Konfirmasi password: ')
  ).trim();

  if (password !== confirmPassword) {
    throw new Error(
      'Konfirmasi password tidak sama.',
    );
  }

  const existingEmail =
    await db.orm.public.User
      .where({ email })
      .first();

  if (
    existingEmail &&
    existingEmail.id !== user.id
  ) {
    throw new Error(
      'Email tersebut sudah digunakan akun lain.',
    );
  }

  const passwordHash =
    await bcrypt.hash(password, 10);

  await db.orm.public.User
    .where({ id: user.id })
    .update({
      email,
      phone: phone || null,
      passwordHash,
    });

  console.log('\n✅ PEMULIHAN AKUN BERHASIL');
  console.log(`NPM    : ${studentProfile.npm}`);
  console.log(`Nama   : ${user.fullName}`);
  console.log(`Email  : ${email}`);
  console.log(`Status : ${user.isActive ? 'AKTIF' : 'NONAKTIF'}`);
  console.log('\nPassword tersimpan sebagai bcrypt hash.');
  console.log('Silakan login menggunakan NPM + password baru.');
} catch (error) {
  console.error(
    `\n❌ ${
      error instanceof Error
        ? error.message
        : 'Terjadi kesalahan.'
    }`,
  );

  process.exitCode = 1;
} finally {
  rl.close();
}
