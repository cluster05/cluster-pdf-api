import { Module } from '@nestjs/common';
import { DocumentModule } from './document/document.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { RateLimiterModule, RateLimiterGuard } from 'nestjs-rate-limiter';
import { MongooseModule } from '@nestjs/mongoose';
@Module({
  imports: [
    ConfigModule.forRoot(),
    RateLimiterModule.register({
      duration: 60,
      points: 10,
      errorMessage: 'Your opration look suspicious. Please try after minute.',
      blockDuration: 60,
    }),
    ScheduleModule.forRoot(),
    DocumentModule,
    MongooseModule.forRoot(process.env.MONGO_DB_URL),
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
