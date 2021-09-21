import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { join } from 'path';
import { ConvertDTO } from './dto/convert.dto';
import { DocumentService } from './document.service';
import { MergeDTO } from './dto/merge.dto';

@Controller('document')
export class DocumentController {
  constructor(private documentService: DocumentService) { }

  @Post('/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uplaod(@UploadedFile() file: Express.Multer.File) {
      return await this.documentService.upload(file);
  }
  
  @Post('/convert')
  convert(@Body() convertDTO: ConvertDTO) {
    return this.documentService.convert(convertDTO);
  }

  @Post('/merge')
  merge(@Body() mergeDTO: MergeDTO) {
    return this.documentService.merge(mergeDTO);
  }

  @Post('/compess')
  compress(){
    return this.documentService.compress();
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    return this.documentService.upload(file);
  }

  @Get('/:document')
  getFile(@Param('document') document: string, @Res() res) {
    return res.sendFile(join(__dirname, '../documents/' + document));
  }

}
