import {
  IsString,
  MinLength,
} from 'class-validator';

export class ResetMemberPasswordDto {
  @IsString()
  @MinLength(8, {
    message: 'Password minimal 8 karakter',
  })
  password!: string;
}
