import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('/full')
  async analytics() {
    return await this.analyticsService.analytics();
  }
}
