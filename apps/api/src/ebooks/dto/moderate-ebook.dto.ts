import {
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

export class ModerateEBookDto {
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
}
