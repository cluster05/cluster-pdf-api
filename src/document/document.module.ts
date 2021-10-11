import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DeleteService } from './delete.service';
import { DocumentSchema } from './schema/document.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports:[
    MongooseModule.forFeature([
      { name: 'Documents', schema: DocumentSchema }
    ]),
  ],
  controllers: [DocumentController],
  providers: [DocumentService, DeleteService],
})
export class DocumentModule {}
