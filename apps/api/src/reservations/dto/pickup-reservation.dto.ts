import {
  IsInt,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class PickupReservationDto {
  @IsInt()
  userId: number;

  @IsString()
  @IsNotEmpty()
  barcode: string;
}
