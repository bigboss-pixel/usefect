import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @Length(5, 30)
  npm?: string;

  @IsOptional()
  @IsString()
  faculty?: string;

  @IsOptional()
  @IsString()
  studyProgram?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  enrollmentYear?: number;
}