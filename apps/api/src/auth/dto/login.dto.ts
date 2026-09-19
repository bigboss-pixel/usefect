import {
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({
    message: 'NPM tidak boleh kosong',
  })
  npm: string;

  @IsString()
  @IsNotEmpty({
    message: 'Password tidak boleh kosong',
  })
  @MinLength(8, {
    message: 'Password minimal 8 karakter',
  })
  password: string;
}
