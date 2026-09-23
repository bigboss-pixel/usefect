import { Module } from '@nestjs/common';
import { BooksModule } from '../../books/books.module.js';
import { LibrarySearchService } from './library-search.service.js';

@Module({
  imports: [BooksModule],
  providers: [LibrarySearchService],
  exports: [LibrarySearchService],
})
export class LibrarySearchModule {}
