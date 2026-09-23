import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsEmail({}, {
    message: 'Email harus valid',
  })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'Nomor telepon tidak valid',
  })
  @MaxLength(30)
  phone?: string;

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
