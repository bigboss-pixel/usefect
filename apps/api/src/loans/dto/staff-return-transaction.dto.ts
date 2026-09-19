import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class StaffReturnTransactionDto {
  @IsString()
  @IsNotEmpty()
  memberQrToken: string;

  @IsString()
  @IsNotEmpty()
  isbn: string;

  @IsOptional()
  @IsInt()
  loanId?: number;

  @IsString()
  @IsIn(['GOOD', 'DAMAGED', 'LOST'])
  condition: string;

  @IsBoolean()
  shelfConfirmed: boolean;
}
