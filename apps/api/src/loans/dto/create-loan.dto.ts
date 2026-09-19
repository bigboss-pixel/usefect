import {
  IsInt,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateLoanDto {
  @IsInt()
  bookCopyId: number;

  @IsString()
  @IsNotEmpty()
  dueDate: string;
}