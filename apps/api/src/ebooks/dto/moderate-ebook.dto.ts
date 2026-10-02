import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
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

  @IsOptional()
  @IsString()
  @IsIn([
    'UNKNOWN',
    'PENDING',
    'VERIFIED',
    'REJECTED',
    'EXPIRED',
  ])
  permissionStatus?: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  permissionEvidence?: string;

  @IsOptional()
  @IsBoolean()
  translationAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  downloadAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  aiRagAllowed?: boolean;
}
