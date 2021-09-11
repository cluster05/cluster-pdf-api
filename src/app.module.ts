import { Module } from '@nestjs/common';
import { UplaodModule } from './uplaod/uplaod.module';
import { ConvertModule } from './convert/convert.module';

@Module({
  imports: [UplaodModule, ConvertModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
