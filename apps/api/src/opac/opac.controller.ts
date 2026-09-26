import { Controller, Get, Query } from '@nestjs/common';
import { OpacSearchOptions, OpacService } from './opac.service.js';

@Controller('opac')
export class OpacController {
  constructor(private readonly opacService: OpacService) {}

  @Get('search')
  async search(
    @Query('q') q?: string,
    @Query('title') title?: string,
    @Query('author') author?: string,
    @Query('subject') subject?: string,
    @Query('isbn') isbn?: string,
    @Query('page') page?: string,
  ) {
    const options: OpacSearchOptions = {
      q: q?.trim() || undefined,
      title: title?.trim() || undefined,
      author: author?.trim() || undefined,
      subject: subject?.trim() || undefined,
      isbn: isbn?.trim() || undefined,
      page: page ? Math.max(1, Number.parseInt(page, 10) || 1) : 1,
    };

    const hasQuery = Object.values(options).some(Boolean);

    if (!hasQuery) {
      return {
        source: 'OPAC UMA',
        total: 0,
        page: 1,
        recordsPerPage: 0,
        items: [],
        message:
          'Gunakan q, title, author, subject, atau isbn untuk melakukan pencarian',
      };
    }

    return this.opacService.search(options);
  }
}
