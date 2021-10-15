import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  checkAuthUser(user: any) {
    if (
      process.env.USER_CRED_USERNAME === user.username &&
      process.env.USER_CRED_PASSWORD === user.password
    ) {
      return true;
    }
    return false;
  }

  @Post()
  async analytics(@Body() user: any) {
    if (this.checkAuthUser(user)) {
      return await this.analyticsService.analytics();
    }
    throw new HttpException(
      'Are you sure. You came to right place.',
      HttpStatus.FORBIDDEN,
    );
  }
}
