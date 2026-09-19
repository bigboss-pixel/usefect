import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({
    message: 'NPM tidak boleh kosong',
  })
  @MaxLength(30, {
    message: 'NPM maksimal 30 karakter',
  })
  npm: string;

  @IsEmail(
    {},
    {
      message: 'Email harus valid',
    },
  )
  email: string;

  @IsString()
  @MinLength(8, {
    message: 'Password minimal 8 karakter',
  })
  password: string;

  @IsString()
  @IsNotEmpty({
    message: 'Nama lengkap tidak boleh kosong',
  })
  @MaxLength(100, {
    message: 'Nama lengkap maksimal 100 karakter',
  })
  fullName: string;

  @IsOptional()
  @IsString()
  @Matches(
    /^[0-9+\-\s()]+$/,
    {
      message: 'Nomor telepon tidak valid',
    },
  )
  @MaxLength(30, {
    message: 'Nomor telepon maksimal 30 karakter',
  })
  phone?: string;

  @IsString()
  @IsNotEmpty({
    message: 'Fakultas tidak boleh kosong',
  })
  @MaxLength(100, {
    message: 'Fakultas maksimal 100 karakter',
  })
  faculty: string;

  @IsString()
  @IsNotEmpty({
    message: 'Program studi tidak boleh kosong',
  })
  @MaxLength(100, {
    message: 'Program studi maksimal 100 karakter',
  })
  studyProgram: string;

  @IsOptional()
  @IsInt()
  enrollmentYear?: number;
}
