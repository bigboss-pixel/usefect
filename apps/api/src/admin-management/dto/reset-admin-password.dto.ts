import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetAdminPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;
}
