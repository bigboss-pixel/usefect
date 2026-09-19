import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class UpdateBookDto {
  @IsOptional()
  @IsString()
  @Length(2, 300)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  isbn?: string;

  @IsOptional()
  @IsString()
  @Length(2, 200)
  author?: string;

  @IsOptional()
  @IsString()
  @Length(2, 200)
  publisher?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  publicationYear?: number;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;
}