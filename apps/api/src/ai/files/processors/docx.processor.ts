import { Injectable } from '@nestjs/common';
import mammoth from 'mammoth';

@Injectable()
export class DocxProcessor {
  async extractText(filePath: string) {
    const result = await mammoth.extractRawText({
      path: filePath,
    });

    return {
      text: result.value.trim(),
    };
  }
}
