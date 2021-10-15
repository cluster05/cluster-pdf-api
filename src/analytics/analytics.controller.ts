import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('/year')
  async year() {
    return await this.analyticsService.year();
  }

  @Get('/full')
  async analytics() {
    return await this.analyticsService.analytics();
  }

  @Get('/opration')
  async opration() {
    return await this.analyticsService.oprationAnalytics();
  }
}
