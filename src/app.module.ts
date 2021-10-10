import { Module } from '@nestjs/common';
import { DocumentModule } from './document/document.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
      DocumentModule,
      ConfigModule.forRoot(),
      ScheduleModule.forRoot()
    ],
  controllers: [],
  providers: [],
})
export class AppModule {}
