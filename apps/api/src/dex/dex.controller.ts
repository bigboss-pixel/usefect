import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { DexIndexerService } from './dex-indexer.service.js';
import { DexService } from './dex.service.js';

@Controller('dex')
export class DexController {
  constructor(
    private readonly dexService: DexService,
    private readonly dexIndexerService: DexIndexerService,
  ) {}

  @Get('pools')
  getPools() {
    return this.dexService.getPools();
  }

  @Get('pools/:poolAddress')
  getPool(@Param('poolAddress') poolAddress: string) {
    return this.dexService.getPool(poolAddress);
  }

  @Get('activities')
  getActivities(
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit?: number,
  ) {
    const normalizedLimit = Math.min(
      Math.max(limit ?? 50, 1),
      100,
    );

    return this.dexService.getActivities(
      normalizedLimit,
    );
  }

  @Get('health')
  getDexHealth() {
    return this.dexIndexerService.getDexHealth();
  }

  @Get('indexer')
  getIndexerState() {
    return this.dexService.getIndexerState();
  }

  @Get('indexer/discover')
  discoverPool() {
    return this.dexIndexerService.discoverKnownPool();
  }

  @Get('indexer/transactions/discover')
  discoverTransactions(
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit?: number,
  ) {
    return this.dexIndexerService.discoverTransactions(
      limit ?? 20,
    );
  }

  @Post('indexer/transactions/sync')
  syncTransactions(
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit?: number,
  ) {
    return this.dexIndexerService.syncTransactions(
      limit ?? 20,
    );
  }

  @Get('indexer/database')
  getIndexerDatabaseState() {
    return this.dexIndexerService.getIndexerDatabaseState();
  }

  @Post('indexer/sync')
  syncKnownPool() {
    return this.dexIndexerService.syncKnownPool();
  }
}
