import { Injectable, BadGatewayException } from '@nestjs/common';

interface OpacRecord {
  '@id'?: string;
  name?: string;
  author?: {
    name?: string[];
  };
  isbn?: string;
  publisher?: string | null;
  dateCreated?: string;
  image?: string;
}

interface OpacResponse {
  total_rows?: string;
  page?: number;
  records_each_page?: string;
  '@graph'?: OpacRecord[];
}

export interface OpacSearchOptions {
  q?: string;
  title?: string;
  author?: string;
  subject?: string;
  isbn?: string;
  page?: number;
}

@Injectable()
export class OpacService {
  private readonly opacUrl = 'https://opac.uma.ac.id/index.php';

  async search(options: OpacSearchOptions) {
    const url = new URL(this.opacUrl);

    url.searchParams.set('JSONLD', 'true');
    url.searchParams.set('search', 'search');

    if (options.page && options.page > 0) {
      url.searchParams.set('page', String(options.page));
    }

    const hasAdvancedFilter =
      options.title ||
      options.author ||
      options.subject ||
      options.isbn;

    if (hasAdvancedFilter) {
      url.searchParams.set('searchtype', 'advance');
      url.searchParams.set('title', options.title ?? '');
      url.searchParams.set('author', options.author ?? '');
      url.searchParams.set('subject', options.subject ?? '');
      url.searchParams.set('isbn', options.isbn ?? '');
      url.searchParams.set('location', '0');
      url.searchParams.set('colltype', '0');
      url.searchParams.set('gmd', '0');
    } else if (options.q) {
      url.searchParams.set('searchtype', 'advance');
      url.searchParams.set('title', options.q);
      url.searchParams.set('author', '');
      url.searchParams.set('subject', '');
      url.searchParams.set('isbn', '');
      url.searchParams.set('location', '0');
      url.searchParams.set('colltype', '0');
      url.searchParams.set('gmd', '0');
    }

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/ld+json, application/json, text/plain, */*",
          "User-Agent": "USEFECT-Knowledge-Hub/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`OPAC returned HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      const raw = await response.text();

      if (!contentType.includes("json")) {
        throw new Error(
          `OPAC returned non-JSON content-type: ${contentType}`,
        );
      }

      const data = JSON.parse(raw) as OpacResponse;

      const items = (data['@graph'] ?? []).map((book) => ({
        id: book['@id'] ?? null,
        title: book.name ?? '',
        authors: book.author?.name ?? [],
        isbn: book.isbn ?? '',
        publisher: book.publisher ?? '',
        year: book.dateCreated ?? '',
        image: book.image ?? null,
      }));

      return {
        source: 'OPAC UMA',
        total: Number(data.total_rows ?? 0),
        page: Number(data.page ?? 1),
        recordsPerPage: Number(data.records_each_page ?? 0),
        items,
      };
    } catch {
      throw new BadGatewayException(
        'Tidak dapat mengambil data dari OPAC UMA',
      );
    }
  }
}
