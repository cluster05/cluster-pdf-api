import { Module } from '@nestjs/common';
import { UplaodModule } from './uplaod/uplaod.module';
import { ConvertModule } from './convert/convert.module';
import { DocumentModule } from './document/document.module';

@Module({
  imports: [UplaodModule, ConvertModule, DocumentModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
