import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { join } from 'path';
import { ConvertDTO } from './dto/convert.dto';
import { DocumentService } from './document.service';
import { MergeDTO } from './dto/merge.dto';
import { SplitDTO } from './dto/split.dto';
import { CompressDTO } from './dto/compress.dto';

@Controller('document')
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  @Post('/upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req) {
    const ip = req.ip;
    return await this.documentService.upload(file, ip);
  }

  @Get('/:document')
  getFile(@Param('document') document: string, @Res() res) {
    return res.sendFile(join(__dirname, '../documents/' + document));
  }

  @Post('/convert')
  async convert(@Body() convertDTO: ConvertDTO) {
    return await this.documentService.convert(convertDTO);
  }

  @Post('/merge')
  async merge(@Body() mergeDTO: MergeDTO) {
    return await this.documentService.merge(mergeDTO);
  }

  @Post('/compress')
  async compress(@Body() compressDTO: CompressDTO) {
    return await this.documentService.compress(compressDTO);
  }

  @Post('/split')
  async split(@Body() splitDTO: SplitDTO) {
    return await this.documentService.split(splitDTO);
  }
}
