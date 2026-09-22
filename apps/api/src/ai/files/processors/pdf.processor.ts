import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { readFile } from 'fs/promises';

@Injectable()
export class PdfProcessor {
  async extractText(filePath: string) {
    const buffer = await readFile(filePath);
    const parser = new PDFParse({
      data: buffer,
    });

    const result = await parser.getText();

    await parser.destroy();

    return {
      text: result.text.trim(),
    };
  }
}
