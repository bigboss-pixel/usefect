import { IsUrl } from 'class-validator';

export class ImportStandardEbookDto {
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
  })
  url!: string;
}
