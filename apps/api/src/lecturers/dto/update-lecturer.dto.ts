import {
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateLecturerDto {
  @IsOptional()
  @IsString()
  @Length(3, 30)
  lecturerNumber?: string;

  @IsOptional()
  @IsString()
  faculty?: string;

  @IsOptional()
  @IsString()
  studyProgram?: string;
}