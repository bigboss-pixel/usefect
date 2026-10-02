import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import * as cheerio from 'cheerio';

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { db } from '../prisma/db.js';

@Injectable()
export class StandardEbooksService {
  private readonly storageRoot = resolve(
    process.env.EBOOK_STORAGE_ROOT ??
      resolve(
        process.cwd(),
        'apps',
        'api',
        'storage',
        'ebooks',
      ),
  );

  async importBook(
    userId: number,
    sourceUrl: string,
  ) {
    const url = new URL(sourceUrl);

    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'standardebooks.org'
    ) {
      throw new BadRequestException(
        'Importer hanya menerima URL resmi standardebooks.org',
      );
    }

    if (
      !url.pathname.startsWith('/ebooks/')
    ) {
      throw new BadRequestException(
        'URL bukan halaman E-Book Standard Ebooks',
      );
    }

    const pageResponse =
      await fetch(sourceUrl);

    if (!pageResponse.ok) {
      throw new BadRequestException(
        `Gagal mengambil halaman Standard Ebooks (${pageResponse.status})`,
      );
    }

    const html =
      await pageResponse.text();

    const $ = cheerio.load(html);

    const rawPageTitle =
      $('meta[property="og:title"]').attr(
        'content',
      ) ??
      $('title').text().trim();

    const pathnameParts =
      url.pathname
        .replace(/^\/ebooks\//, '')
        .replace(/\/+$/, '')
        .split('/')
        .filter(Boolean);

    const authorSlug =
      pathnameParts[0] ?? '';

    const bookSlug =
      pathnameParts[1] ?? '';

    const slugToTitle = (
      slug: string,
    ) =>
      slug
        .split('-')
        .filter(Boolean)
        .map(
          (part) =>
            part.charAt(0).toUpperCase() +
            part.slice(1),
        )
        .join(' ');

    const titleFromPage =
      rawPageTitle
        .replace(
          /\s*,\s*by\s+.+$/i,
          '',
        )
        .replace(
          /\s+-\s+Free ebook download$/i,
          '',
        )
        .trim();

    const authorFromPage =
      $('meta[name="author"]').attr(
        'content',
      )?.trim() ??
      $('meta[property="book:author"]').attr(
        'content',
      )?.trim() ??
      rawPageTitle.match(
        /,\s*by\s+(.+?)(?:\s+-\s+Free ebook download)?$/i,
      )?.[1]?.trim();

    const title =
      titleFromPage ||
      slugToTitle(bookSlug) ||
      'Untitled';

    const author =
      authorFromPage ||
      slugToTitle(authorSlug) ||
      'Unknown Author';

    const epubHref =
      $('a[href$=".epub"]')
        .first()
        .attr('href') ??
      null;

    if (!epubHref) {
      throw new BadRequestException(
        'Link EPUB resmi tidak ditemukan pada halaman Standard Ebooks',
      );
    }

    const epubUrl =
      new URL(
        epubHref,
        sourceUrl,
      ).toString();

    const existing =
      await db.orm.public.EBook
        .where({
          sourceUrl,
        })
        .first();

    const epubResponse =
      await fetch(epubUrl);

    if (!epubResponse.ok) {
      throw new BadRequestException(
        `Gagal mengunduh EPUB (${epubResponse.status})`,
      );
    }

    const contentType =
      epubResponse.headers.get(
        'content-type',
      ) ?? '';

    if (
      !contentType.includes('epub') &&
      !epubUrl.toLowerCase().endsWith('.epub')
    ) {
      throw new BadRequestException(
        'Resource yang diterima bukan EPUB',
      );
    }

    const buffer =
      Buffer.from(
        await epubResponse.arrayBuffer(),
      );

    if (!buffer.length) {
      throw new BadRequestException(
        'File EPUB kosong',
      );
    }

    const pathname =
      url.pathname
        .replace(/^\/ebooks\//, '')
        .replace(/\/+$/, '');

    const slug =
      pathname
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120);

    const filename =
      `${Date.now()}-${slug || 'standard-ebook'}.epub`;

    await mkdir(
      this.storageRoot,
      { recursive: true },
    );

    await writeFile(
      resolve(
        this.storageRoot,
        filename,
      ),
      buffer,
    );

    const ebook = existing
      ? await db.orm.public.EBook
          .where({ id: existing.id })
          .update({
            title:
              title || 'Untitled',
            author,
            publisher:
              'Standard Ebooks',
            language: 'English',
            fileUrl:
              `private-ebooks/${filename}`,
            fileType: 'EPUB',
            license:
              existing.license ??
              'CC0 1.0 Universal Public Domain Dedication',
            source:
              'Standard Ebooks',
            permissionStatus:
              existing.permissionStatus,
            permissionEvidence:
              existing.permissionEvidence,
            sourceUrl,
            licenseUrl:
              existing.licenseUrl ??
              'https://creativecommons.org/publicdomain/zero/1.0/',
            translationAllowed:
              existing.translationAllowed,
            downloadAllowed:
              existing.downloadAllowed,
            aiRagAllowed:
              existing.aiRagAllowed,
            accessType:
              existing.accessType,
            status:
              existing.status,
          })
      : await db.orm.public.EBook.create({
          title:
            title || 'Untitled',
          author,
          isbn: null,
          publisher:
            'Standard Ebooks',
          publicationYear: null,
          category: null,
          language: 'English',
          description: null,
          coverUrl: null,
          fileUrl:
            `private-ebooks/${filename}`,
          fileType: 'EPUB',
          license:
            'CC0 1.0 Universal Public Domain Dedication',
          source:
            'Standard Ebooks',
          permissionStatus:
            'UNKNOWN',
          permissionEvidence:
            'Imported from Standard Ebooks. Legal verification required before publication.',
          sourceUrl,
          licenseUrl:
            'https://creativecommons.org/publicdomain/zero/1.0/',
          translationAllowed: false,
          downloadAllowed: false,
          aiRagAllowed: false,
          accessType: 'READ_ONLY',
          status: 'DRAFT',
          uploadedByUserId: userId,
        });

    if (!ebook) {
      throw new BadRequestException(
        'E-Book gagal disimpan ke database',
      );
    }

    return {
      message:
        'E-Book Standard Ebooks berhasil diimpor dan menunggu verifikasi',

      ebook: {
        id: ebook.id,
        title: ebook.title,
        author: ebook.author,
        fileType: ebook.fileType,
        source: ebook.source,
        sourceUrl: ebook.sourceUrl,
        license: ebook.license,
        permissionStatus:
          ebook.permissionStatus,
        status: ebook.status,
      },
    };
  }
}
