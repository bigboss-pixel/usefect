import { Module } from '@nestjs/common';
import { WebSearchService } from './web-search.service.js';

@Module({
  providers: [WebSearchService],
  exports: [WebSearchService],
})
export class WebSearchModule {}
