import { Module } from '@nestjs/common';
import { AiFilesService } from './ai-files.service.js';
import { PdfProcessor } from './processors/pdf.processor.js';
import { TextProcessor } from './processors/text.processor.js';
import { DocxProcessor } from './processors/docx.processor.js';
import { ImageProcessor } from './processors/image.processor.js';

@Module({
  providers: [
    AiFilesService,
    PdfProcessor,
    TextProcessor,
    DocxProcessor,
    ImageProcessor,
  ],
  exports: [AiFilesService],
})
export class AiFilesModule {}
