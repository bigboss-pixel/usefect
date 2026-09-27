import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EBookQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  publicationYear?: number;

  @IsOptional()
  @IsString()
  license?: string;

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

  @IsOptional()
  @IsString()
  @IsIn([
    'READ_ONLY',
    'DOWNLOAD',
    'READ_AND_DOWNLOAD',
  ])
  accessType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsIn([
    'title',
    'author',
    'publicationYear',
  ])
  sortBy?: string;

  @IsOptional()
  @IsIn([
    'asc',
    'desc',
  ])
  sortOrder?: string;
}
