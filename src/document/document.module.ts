import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DeleteService } from './delete.service';

@Module({
  controllers: [DocumentController],
  providers: [DocumentService, DeleteService],
})
export class DocumentModule {}
