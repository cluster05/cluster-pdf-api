import { Module } from '@nestjs/common';
import { UplaodController } from './uplaod.controller';
import { UplaodService } from './uplaod.service';

@Module({
  controllers: [UplaodController],
  providers: [UplaodService]
})
export class UplaodModule {}
