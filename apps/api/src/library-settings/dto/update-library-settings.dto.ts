import {
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdateLibrarySettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  maxActiveLoans?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  loanDurationDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxRenewals?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  renewalDurationDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  finePerDay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  reservationExpiryHours?: number;
}
