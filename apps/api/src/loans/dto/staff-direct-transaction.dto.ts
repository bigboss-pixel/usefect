import { IsNotEmpty, IsString } from 'class-validator';

export class StaffDirectTransactionDto {
  @IsString()
  @IsNotEmpty()
  memberQrToken: string;

  @IsString()
  @IsNotEmpty()
  isbn: string;
}
