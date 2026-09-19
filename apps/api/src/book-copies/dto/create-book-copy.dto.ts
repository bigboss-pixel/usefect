import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateBookCopyDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  barcode: string;

  @IsInt()
  @Min(1)
  bookId: number;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  shelfLocation?: string;

  @IsOptional()
  @IsString()
  @IsIn([
    'AVAILABLE',
    'BORROWED',
    'LOST',
    'DAMAGED',
  ])
  status?: string;
}