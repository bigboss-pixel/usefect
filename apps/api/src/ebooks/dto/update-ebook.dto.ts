import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Min,
} from 'class-validator';

export class UpdateEBookDto {
  @IsOptional()
  @IsString()
  @Length(2, 300)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(2, 200)
  author?: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  isbn?: string;

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
  @Length(2, 100)
  category?: string;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  language?: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  description?: string;

  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @IsOptional()
  @IsUrl()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(['PDF', 'EPUB', 'OTHER'])
  fileType?: string;

  @IsOptional()
  @IsString()
  @Length(2, 200)
  license?: string;

  @IsOptional()
  @IsString()
  @Length(2, 500)
  source?: string;

  @IsOptional()
  @IsString()
  @IsIn([
    'READ_ONLY',
    'DOWNLOAD',
    'READ_AND_DOWNLOAD',
  ])
  accessType?: string;

  @IsOptional()
  @IsString()
  @IsIn([
    'DRAFT',
    'PENDING_REVIEW',
    'LICENSE_VERIFIED',
    'TRANSLATING',
    'TRANSLATION_REVIEW',
    'PUBLISHED',
    'SUSPENDED',
  ])
  status?: string;
}
