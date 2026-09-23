import { Module } from '@nestjs/common';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AiFilesModule } from './files/ai-files.module.js';
import { WebSearchModule } from './search/web-search.module.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { AiProviderService } from './providers/ai-provider.service.js';
import { OpenRouterProvider } from './providers/openrouter.provider.js';
import { LibrarySearchModule } from './library/library-search.module.js';

@Module({
  imports: [AiFilesModule, WebSearchModule, LibrarySearchModule],
  controllers: [AiController],
  providers: [AiService, GeminiProvider, OpenRouterProvider, AiProviderService],
  exports: [AiService, AiProviderService],
})
export class AiModule {}
