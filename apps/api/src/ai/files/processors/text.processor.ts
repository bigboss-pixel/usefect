import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';

@Injectable()
export class TextProcessor {
  async extractText(filePath: string) {
    const text = await readFile(filePath, 'utf8');

    return {
      text: text.trim(),
    };
  }
}
