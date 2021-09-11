import { Module } from '@nestjs/common';
import { ConvertModule } from './convert/convert.module';
import { DocumentModule } from './document/document.module';

@Module({
  imports: [ConvertModule, DocumentModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
