import { Module } from '@nestjs/common';
import { DocumentModule } from './document/document.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core'
import { RateLimiterModule, RateLimiterGuard } from 'nestjs-rate-limiter'
@Module({
  imports: [
      ConfigModule.forRoot(),
      RateLimiterModule.register({
        duration: 60, // 60 second 
        points: 10 ,  // number of hits per duration
        errorMessage:"Your opration look suspicious. Please try after minute.",
        blockDuration:60,
      }),
      ScheduleModule.forRoot(),
      DocumentModule,
    ],
  controllers: [],
  providers: [
    {
        provide: APP_GUARD,
        useClass: RateLimiterGuard,
    },
  ],
})
export class AppModule {}
