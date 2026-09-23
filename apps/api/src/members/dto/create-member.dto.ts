import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMemberDto {
  @IsString()
  @IsNotEmpty({
    message: 'Nama lengkap tidak boleh kosong',
  })
  @MaxLength(100, {
    message: 'Nama lengkap maksimal 100 karakter',
  })
  fullName!: string;

  @IsEmail(
    {},
    {
      message: 'Email harus valid',
    },
  )
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'Nomor telepon tidak valid',
  })
  @MaxLength(30, {
    message: 'Nomor telepon maksimal 30 karakter',
  })
  phone?: string;

  @IsString()
  @MinLength(8, {
    message: 'Password minimal 8 karakter',
  })
  password!: string;

  @IsIn(['MAHASISWA', 'DOSEN', 'ANGGOTA'], {
    message:
      'Jenis anggota harus MAHASISWA, DOSEN, atau ANGGOTA',
  })
  type!: 'MAHASISWA' | 'DOSEN' | 'ANGGOTA';

  @IsOptional()
  @IsString()
  @MaxLength(30)
  npm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lecturerNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  faculty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  studyProgram?: string;

  @IsOptional()
  @IsInt()
  enrollmentYear?: number;
}
