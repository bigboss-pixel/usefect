import {
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { PdfProcessor } from './processors/pdf.processor.js';
import { TextProcessor } from './processors/text.processor.js';
import { DocxProcessor } from './processors/docx.processor.js';
import { ImageProcessor } from './processors/image.processor.js';

@Injectable()
export class AiFilesService {
  constructor(
    private readonly pdfProcessor: PdfProcessor,
    private readonly textProcessor: TextProcessor,
    private readonly docxProcessor: DocxProcessor,
    private readonly imageProcessor: ImageProcessor,
  ) {}

  private getFilePath(fileId: string) {
    return join(
      process.cwd(),
      'uploads',
      'ai',
      fileId,
    );
  }

  async extractText(fileId: string, mimeType?: string) {
    const filePath = this.getFilePath(fileId);

    if (!existsSync(filePath)) {
      throw new NotFoundException(
        'Uploaded file was not found.',
      );
    }

    const extension = extname(fileId).toLowerCase();

    if (
      extension === '.pdf' ||
      mimeType === 'application/pdf'
    ) {
      return this.pdfProcessor.extractText(filePath);
    }

    if (
      extension === '.txt' ||
      mimeType === 'text/plain'
    ) {
      return this.textProcessor.extractText(filePath);
    }

    if (
      extension === '.docx' ||
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return this.docxProcessor.extractText(filePath);
    }

    if (
      ['.jpg', '.jpeg', '.png', '.webp'].includes(
        extension,
      ) ||
      (mimeType || '').startsWith('image/')
    ) {
      return this.imageProcessor.inspect(
        filePath,
        mimeType,
      );
    }

    throw new UnsupportedMediaTypeException(
      'This file type does not have a text processor yet.',
    );
  }

  async getImageData(
    fileId: string,
    mimeType?: string,
  ) {
    const filePath = this.getFilePath(fileId);

    if (!existsSync(filePath)) {
      throw new NotFoundException(
        'Uploaded image was not found.',
      );
    }

    const extension = extname(fileId).toLowerCase();

    const allowedExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
    ];

    if (!allowedExtensions.includes(extension)) {
      throw new UnsupportedMediaTypeException(
        'The uploaded file is not a supported image.',
      );
    }

    const buffer = await readFile(filePath);

    let normalizedMimeType = mimeType;

    if (!normalizedMimeType) {
      const mimeByExtension: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
      };

      normalizedMimeType =
        mimeByExtension[extension];
    }

    if (
      !normalizedMimeType ||
      !normalizedMimeType.startsWith('image/')
    ) {
      throw new UnsupportedMediaTypeException(
        'Invalid image MIME type.',
      );
    }

    return {
      data: buffer.toString('base64'),
      mimeType: normalizedMimeType,
    };
  }
}
