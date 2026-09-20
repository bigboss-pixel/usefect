import {
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class PickupReservationDto {
  @IsString()
  @IsNotEmpty()
  memberQrToken: string;

  @IsString()
  @IsNotEmpty()
  isbn: string;
}
