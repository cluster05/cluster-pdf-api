import { Module } from '@nestjs/common';
import { DocumentModule } from './document/document.module';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [DocumentModule,ConfigModule.forRoot()],
  controllers: [],
  providers: [],
})
export class AppModule {}
