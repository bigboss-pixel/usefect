import {
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @Length(2, 50)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
