import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class ChatDto {
  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsString()
  previousInteractionId?: string;

  @IsOptional()
  @IsString()
  fileId?: string;

  @IsOptional()
  @IsString()
  fileMimeType?: string;


  @IsOptional()
  @IsBoolean()
  webSearch?: boolean;
}
