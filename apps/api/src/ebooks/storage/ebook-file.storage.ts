import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';
import {
  createReadStream,
  existsSync,
  statSync,
} from 'node:fs';
import { resolve } from 'node:path';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

export type EbookFilePurpose =
  | 'read'
  | 'download';

type SignedPayload = {
  ebookId: number;
  purpose: EbookFilePurpose;
  exp: number;
};

export class EbookFileStorage {
  private readonly secret =
    process.env.EBOOK_FILE_SECRET ??
    'usefect-development-ebook-secret-change-before-production';

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

  private sign(value: string) {
    return createHmac(
      'sha256',
      this.secret,
    )
      .update(value)
      .digest('base64url');
  }

  createSignedToken(
    ebookId: number,
    purpose: EbookFilePurpose,
    expiresInSeconds = 300,
  ) {
    const payload: SignedPayload = {
      ebookId,
      purpose,
      exp:
        Math.floor(Date.now() / 1000) +
        expiresInSeconds,
    };

    const encoded = Buffer.from(
      JSON.stringify(payload),
    ).toString('base64url');

    return `${encoded}.${this.sign(encoded)}`;
  }

  verifySignedToken(
    token: string,
    ebookId: number,
    purpose: EbookFilePurpose,
  ) {
    const [encoded, signature] =
      token.split('.');

    if (!encoded || !signature) {
      throw new BadRequestException(
        'Token file tidak valid',
      );
    }

    const expected =
      this.sign(encoded);

    const a = Buffer.from(
      signature,
      'utf8',
    );

    const b = Buffer.from(
      expected,
      'utf8',
    );

    if (
      a.length !== b.length ||
      !timingSafeEqual(a, b)
    ) {
      throw new BadRequestException(
        'Token file tidak valid',
      );
    }

    let payload: SignedPayload;

    try {
      payload = JSON.parse(
        Buffer.from(
          encoded,
          'base64url',
        ).toString('utf8'),
      );
    } catch {
      throw new BadRequestException(
        'Token file tidak valid',
      );
    }

    if (
      payload.ebookId !== ebookId ||
      payload.purpose !== purpose ||
      payload.exp <
        Math.floor(Date.now() / 1000)
    ) {
      throw new BadRequestException(
        'Token file sudah tidak berlaku',
      );
    }

    return payload;
  }

  resolveFile(fileUrl: string) {
    const normalized =
      fileUrl
        .replace(/^https?:\/\/[^/]+/, '')
        .replace(/^\/+/, '');

    const privatePrefix =
      normalized.startsWith('private-ebooks/')
        ? 'private-ebooks/'
        : normalized.startsWith('dev-ebooks/')
          ? 'dev-ebooks/'
          : null;

    if (privatePrefix) {
      const filename =
        normalized.substring(
          privatePrefix.length,
        );

      const safeName =
        filename
          .split('/')
          .pop() ?? '';

      if (!safeName) {
        throw new NotFoundException(
          'File E-Book tidak ditemukan',
        );
      }

      return resolve(
        this.storageRoot,
        safeName,
      );
    }

    throw new BadRequestException(
      'File E-Book belum menggunakan private storage',
    );
  }

  openFile(fileUrl: string) {
    const filePath =
      this.resolveFile(fileUrl);

    if (!existsSync(filePath)) {
      throw new NotFoundException(
        'File E-Book tidak ditemukan',
      );
    }

    const stats =
      statSync(filePath);

    if (!stats.isFile()) {
      throw new NotFoundException(
        'File E-Book tidak valid',
      );
    }

    return {
      path: filePath,
      stream: createReadStream(
        filePath,
      ),
      size: stats.size,
    };
  }
}
