import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import * as cheerio from 'cheerio';

import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

import { db } from '../prisma/db.js';

@Injectable()
export class StandardEbooksService {


  private async convertEpubToPdf(
    epubPath: string,
    pdfPath: string,
  ): Promise<void> {
    try {
      await this.execFileAsync(
        'python3',
        [
          'scripts/epub_to_pdf.py',
          epubPath,
          pdfPath,
        ],
        {
          maxBuffer: 20 * 1024 * 1024,
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
          },
        },
      );
    } catch (error: any) {
      const stderr =
        error?.stderr ||
        error?.message ||
        'Unknown EPUB to PDF conversion error';

      throw new BadRequestException(
        `Gagal mengubah EPUB menjadi PDF: ${stderr}`,
      );
    }
  }

  private readonly execFileAsync = promisify(execFile);

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

    let epubResponse =
      await fetch(epubUrl);

    if (!epubResponse.ok) {
      throw new BadRequestException(
        `Gagal mengunduh EPUB (${epubResponse.status})`,
      );
    }

    let buffer =
      Buffer.from(
        await epubResponse.arrayBuffer(),
      );

    if (!buffer.length) {
      throw new BadRequestException(
        'File EPUB kosong',
      );
    }

    const isZipBuffer = (
      value: Buffer,
    ) =>
      value.length >= 4 &&
      value[0] === 0x50 &&
      value[1] === 0x4b &&
      value[2] === 0x03 &&
      value[3] === 0x04;

    /*
     * Standard Ebooks dapat mengembalikan halaman
     * "Your Download Has Started!" terlebih dahulu.
     * Halaman tersebut mengarahkan ke URL .epub sebenarnya.
     *
     * Jika respons pertama bukan ZIP/EPUB, cari redirect
     * download yang sebenarnya dari halaman HTML tersebut.
     */
    if (!isZipBuffer(buffer)) {
      const html =
        buffer.toString('utf8');

      const downloadMatch =
        html.match(
          /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"']+)["']/i,
        );

      const downloadHref =
        downloadMatch?.[1]?.trim();

      if (!downloadHref) {
        throw new BadRequestException(
          'Resource Standard Ebooks bukan file EPUB dan URL download sebenarnya tidak ditemukan',
        );
      }

      const realEpubUrl =
        new URL(
          downloadHref,
          epubResponse.url || epubUrl,
        ).toString();

      epubResponse =
        await fetch(realEpubUrl);

      if (!epubResponse.ok) {
        throw new BadRequestException(
          `Gagal mengunduh file EPUB sebenarnya (${epubResponse.status})`,
        );
      }

      buffer =
        Buffer.from(
          await epubResponse.arrayBuffer(),
        );
    }

    if (!isZipBuffer(buffer)) {
      throw new BadRequestException(
        'File yang diterima bukan EPUB yang valid',
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

    const pdfFilename =
      filename.replace(
        /\.epub$/i,
        '.pdf',
      );

    await mkdir(
      this.storageRoot,
      { recursive: true },
    );

    const epubPath =
      resolve(
        this.storageRoot,
        filename,
      );

    const pdfPath =
      resolve(
        this.storageRoot,
        pdfFilename,
      );

    // EPUB disimpan sementara.
    await writeFile(
      epubPath,
      buffer,
    );

    // Konversi EPUB menjadi PDF.
    await this.convertEpubToPdf(
      epubPath,
      pdfPath,
    );

    // EPUB tidak diperlukan setelah PDF berhasil dibuat.
    await unlink(epubPath).catch(
      () => undefined,
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
              `private-ebooks/${pdfFilename}`,
            fileType: 'PDF',
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
            `private-ebooks/${pdfFilename}`,
          fileType: 'PDF',
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
