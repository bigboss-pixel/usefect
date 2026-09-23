import { Injectable } from '@nestjs/common';
import { BooksService } from '../../books/books.service.js';

export type LibrarySearchSource = {
  id: number;
  title: string;
  url: string;
  source: string;
};

@Injectable()
export class LibrarySearchService {
  constructor(
    private readonly booksService: BooksService,
  ) {}

  shouldSearch(query: string): boolean {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return false;
    }

    const keywords = [
      'buku',
      'book',
      'koleksi',
      'perpustakaan',
      'library',
      'katalog',
      'isbn',
      'penulis',
      'pengarang',
      'penerbit',
      'tersedia',
      'available',
      'dipinjam',
      'pinjam',
      'rak',
      'bacaan',
      'cari buku',
      'carikan buku',
    ];

    return keywords.some((keyword) => normalized.includes(keyword));
  }

  private extractSearchTerms(query: string): string {
    let value = query
      .toLowerCase()
      .replace(/[?!.,;:()[\]{}]/g, ' ');

    // Ambil hanya bagian pertanyaan yang berkaitan dengan pencarian buku.
    // Contoh:
    // "carikan buku tentang teknologi, lalu jelaskan perkembangan terbaru"
    // -> "buku tentang teknologi"
    value = value.split(/\b(lalu|kemudian|setelah itu)\b/)[0];
    value = value.split(/\b(dan jelaskan|serta jelaskan|jelaskan juga)\b/)[0];

    const phrases = [
      'carikan buku',
      'cari buku',
      'tolong carikan buku',
      'tolong cari buku',
      'buku yang tersedia',
      'buku tersedia',
      'yang tersedia',
      'yang bisa dipinjam',
      'yang dapat dipinjam',
      'di perpustakaan',
      'di library',
      'perpustakaan uma',
      'library uma',
      'di uma',
    ];

    for (const phrase of phrases) {
      value = value.replaceAll(phrase, ' ');
    }

    const stopWords = new Set([
      'saya',
      'aku',
      'mau',
      'ingin',
      'tolong',
      'bisa',
      'boleh',
      'dong',
      'ya',
      'ada',
      'apa',
      'apakah',
      'untuk',
      'tentang',
      'mengenai',
      'yang',
      'di',
      'dari',
      'ke',
      'dan',
      'atau',
      'dengan',
      'pada',
      'dalam',
      'ini',
      'itu',
      'buku',
      'book',
      'tersedia',
      'available',
      'perpustakaan',
      'library',
      'katalog',
      'koleksi',
      'carikan',
      'cari',
      'menemukan',
      'temukan',
      'dipinjam',
      'pinjam',
    ]);

    const terms = value
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean)
      .filter((term) => !stopWords.has(term))
      .filter((term) => term.length >= 2);

    return terms.join(' ').trim();
  }

  async buildSearchContext(
    query: string,
    limit = 8,
  ): Promise<{
    context: string;
    sources: LibrarySearchSource[];
  }> {
    if (!this.shouldSearch(query)) {
      return {
        context: '',
        sources: [],
      };
    }

    const searchTerms = this.extractSearchTerms(query);

    const wantsAvailable =
      /tersedia|available|bisa dipinjam|dapat dipinjam/i.test(query);

    const result = await this.booksService.findAll({
      ...(searchTerms ? { search: searchTerms } : {}),
      limit,
      page: 1,
      ...(wantsAvailable ? { isAvailable: true } : {}),
    });

    const books = result?.data ?? [];

    if (!books.length) {
      return {
        context: [
          'USEFECT LIBRARY SEARCH',
          'No matching books were found in the USEFECT Library catalog.',
          searchTerms
            ? `Library search terms: ${searchTerms}`
            : 'No specific library search terms were extracted.',
        ].join('\n'),
        sources: [],
      };
    }

    const context = [
      'The following information was retrieved from the USEFECT Library catalog.',
      'Use it as library catalog context when answering the user.',
      'Do not invent books, availability, authors, ISBNs, publishers, or shelf locations.',
      '',
      ...books.map(
        (book: any, index: number) =>
          `[LIBRARY BOOK ${index + 1}]
Title: ${book.title}
Author: ${book.author}
ISBN: ${book.isbn || 'Not available'}
Publisher: ${book.publisher || 'Not available'}
Publication Year: ${book.publicationYear || 'Not available'}
Description: ${book.description || 'Not available'}
Category: ${book.category?.name || 'Not available'}
Total Copies: ${book.availability?.total ?? 0}
Available Copies: ${book.availability?.available ?? 0}
Borrowed Copies: ${book.availability?.borrowed ?? 0}
Available Shelf Locations: ${
            book.availability?.locations?.length
              ? book.availability.locations.join(', ')
              : 'Not available'
          }`,
      ),
    ].join('\n\n');

    const baseUrl =
      process.env.WEB_APP_URL || 'http://localhost:3000';

    const sources: LibrarySearchSource[] = books.map(
      (book: any, index: number) => ({
        id: index + 1,
        title: book.title,
        url: `${baseUrl}/katalog?search=${encodeURIComponent(book.title)}`,
        source: 'USEFECT Library',
      }),
    );

    return {
      context,
      sources,
    };
  }
}
