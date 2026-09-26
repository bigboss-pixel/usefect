import { Module } from '@nestjs/common';
import { OpacController } from './opac.controller.js';
import { OpacService } from './opac.service.js';

@Module({
  controllers: [OpacController],
  providers: [OpacService],
  exports: [OpacService],
})
export class OpacModule {}
