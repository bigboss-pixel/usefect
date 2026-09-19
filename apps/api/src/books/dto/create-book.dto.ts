import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 300)
  title: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 20)
  isbn: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 200)
  author: string;

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

  @IsInt()
  @Min(1)
  categoryId: number;
}
