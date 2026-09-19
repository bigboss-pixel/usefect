import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateLecturerDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsString()
  @IsNotEmpty()
  @Length(3, 30)
  lecturerNumber: string;

  @IsOptional()
  @IsString()
  faculty?: string;

  @IsOptional()
  @IsString()
  studyProgram?: string;
}