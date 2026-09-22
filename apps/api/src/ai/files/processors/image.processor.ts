import {
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { stat } from 'fs/promises';
import { extname } from 'path';

@Injectable()
export class ImageProcessor {
  private readonly allowedExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
  ];

  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  async inspect(
    filePath: string,
    mimeType?: string,
  ) {
    const extension = extname(filePath).toLowerCase();

    if (
      !this.allowedExtensions.includes(extension) &&
      !this.allowedMimeTypes.includes(mimeType || '')
    ) {
      throw new UnsupportedMediaTypeException(
        'Unsupported image format.',
      );
    }

    const fileStats = await stat(filePath);

    return {
      type: 'image',
      extension,
      mimeType: mimeType || null,
      size: fileStats.size,
      path: filePath,
    };
  }
}
