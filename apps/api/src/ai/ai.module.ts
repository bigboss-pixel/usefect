import { Module } from '@nestjs/common';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AiFilesModule } from './files/ai-files.module.js';
import { WebSearchModule } from './search/web-search.module.js';

@Module({
  imports: [AiFilesModule, WebSearchModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
