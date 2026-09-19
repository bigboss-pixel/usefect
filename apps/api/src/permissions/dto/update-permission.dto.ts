import {
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdatePermissionDto {
  @IsOptional()
  @IsString()
  @Length(3, 100)
  @Matches(/^[A-Z_]+$/, {
    message:
      'Code permission harus menggunakan huruf kapital dan underscore',
  })
  code?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
