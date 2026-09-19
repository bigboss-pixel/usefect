import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ForgotPasswordRequestDto {
  @IsString()
  @IsNotEmpty({
    message: 'NPM tidak boleh kosong',
  })
  @MaxLength(30, {
    message: 'NPM maksimal 30 karakter',
  })
  npm: string;
}

export class ForgotPasswordVerifyDto {
  @IsString()
  @IsNotEmpty({
    message: 'NPM tidak boleh kosong',
  })
  @MaxLength(30, {
    message: 'NPM maksimal 30 karakter',
  })
  npm: string;

  @IsString()
  @MinLength(6, {
    message: 'OTP harus 6 digit',
  })
  @MaxLength(6, {
    message: 'OTP harus 6 digit',
  })
  otp: string;
}

export class ForgotPasswordResetDto {
  @IsString()
  @IsNotEmpty({
    message: 'Reset token tidak boleh kosong',
  })
  resetToken: string;

  @IsString()
  @MinLength(8, {
    message: 'Password minimal 8 karakter',
  })
  newPassword: string;
}
