import { IsNotEmpty, IsString } from 'class-validator';

export class StaffTransactionDto {
  @IsString()
  @IsNotEmpty()
  memberQrToken: string;

  @IsString()
  @IsNotEmpty()
  barcode: string;
}
