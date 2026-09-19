import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class UpdateBookCopyDto {
  @IsOptional()
  @IsString()
  @Length(3, 100)
  barcode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  bookId?: number;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  shelfLocation?: string;
}