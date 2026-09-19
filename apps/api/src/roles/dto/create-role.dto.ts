import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
