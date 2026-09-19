import { IsString, Length } from 'class-validator';

export class ValidateMemberQrDto {
  @IsString()
  @Length(20, 500)
  token!: string;
}
