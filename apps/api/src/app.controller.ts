import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { HealthService } from './health.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly healthService: HealthService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth() {
    return this.healthService.check();
  }
}
