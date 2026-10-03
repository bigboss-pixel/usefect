import { Module } from '@nestjs/common';
import { DexController } from './dex.controller.js';
import { DexIndexerService } from './dex-indexer.service.js';
import { DexService } from './dex.service.js';

@Module({
  controllers: [DexController],
  providers: [DexService, DexIndexerService],
  exports: [DexService, DexIndexerService],
})
export class DexModule {}
