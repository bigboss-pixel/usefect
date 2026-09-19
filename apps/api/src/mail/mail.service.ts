import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter = nodemailer.createTransport({
    host: process.env['SMTP_HOST'],
    port: Number(process.env['SMTP_PORT'] ?? 465),
    secure: process.env['SMTP_SECURE'] === 'true',
    auth: {
      user: process.env['SMTP_USER'],
      pass: process.env['SMTP_PASS'],
    },
  });

  async sendPasswordResetOtp(
    email: string,
    otp: string,
  ) {
    const from =
      process.env['SMTP_FROM'] ??
      process.env['SMTP_USER'];

    if (!from) {
      throw new InternalServerErrorException(
        'Konfigurasi SMTP belum lengkap',
      );
    }

    try {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: 'Kode OTP Pemulihan Password — UMA Library',
        text: [
          'UMA LIBRARY',
          '',
          'Kode OTP Pemulihan Password',
          '',
          `Kode OTP Anda: ${otp}`,
          '',
          'Kode ini berlaku selama 10 menit.',
          'Jangan berikan kode OTP ini kepada siapa pun.',
          '',
          'Jika Anda tidak meminta pemulihan password, abaikan email ini.',
          '',
          'Perpustakaan Universitas Medan Area',
        ].join('\n'),
        html: `
          <div style="margin:0;padding:40px 20px;background:#f4f8ff;font-family:Arial,sans-serif;color:#172b4d;">
            <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:22px;padding:36px;box-shadow:0 18px 50px rgba(40,77,130,.12);">
              <div style="font-size:13px;font-weight:800;letter-spacing:3px;color:#1769e8;">
                UMA LIBRARY
              </div>

              <h1 style="margin:22px 0 10px;font-size:26px;color:#13233f;">
                Kode OTP Pemulihan Password
              </h1>

              <p style="margin:0 0 26px;color:#718198;line-height:1.7;font-size:14px;">
                Gunakan kode berikut untuk melanjutkan proses pemulihan password akun Anda.
              </p>

              <div style="padding:20px;text-align:center;border-radius:16px;background:#f1f6ff;border:1px solid #dce9ff;">
                <div style="font-size:34px;font-weight:900;letter-spacing:8px;color:#1769e8;">
                  ${otp}
                </div>
              </div>

              <p style="margin:22px 0 0;color:#718198;line-height:1.7;font-size:13px;">
                Kode ini berlaku selama <strong>10 menit</strong>.
                Jangan berikan kode OTP ini kepada siapa pun.
              </p>

              <p style="margin:22px 0 0;color:#9aa8bb;line-height:1.6;font-size:12px;">
                Jika Anda tidak meminta pemulihan password, abaikan email ini.
              </p>

              <div style="margin-top:28px;padding-top:18px;border-top:1px solid #edf1f7;color:#a0aec0;font-size:11px;">
                Perpustakaan Universitas Medan Area
              </div>
            </div>
          </div>
        `,
      });
    } catch (error) {
      console.error(
        '[MAIL] Gagal mengirim OTP:',
        error,
      );

      throw new InternalServerErrorException(
        'Gagal mengirim kode OTP ke email',
      );
    }
  }
}
