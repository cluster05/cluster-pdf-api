import {
  Body,
  Controller,
  Get,
  Logger,
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
import { SplitDTO } from './dto/split.dto';
import { CompressDTO } from './dto/compress.dto';
@Controller('document')
export class DocumentController {

  private readonly logger = new Logger(DocumentController.name);

  constructor(private documentService: DocumentService) { }

  @Post('/upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    this.logger.log('[Upload] file : ')
    this.logger.log(file)
    return await this.documentService.upload(file);
  }

  @Get('/:document')
  getFile(@Param('document') document: string, @Res() res) {
    this.logger.log('[Get] file : '+ document)
    return res.sendFile(join(__dirname, '../documents/' + document));
  }  
  
  @Post('/convert')
  async convert(@Body() convertDTO: ConvertDTO) {
    this.logger.log(`[Convert] URL : ${convertDTO.url} \n from [${convertDTO.from}-${convertDTO.fromType}] to [${convertDTO.to}-${convertDTO.toType}]`)
    return await this.documentService.convert(convertDTO);
  }

  @Post('/merge')
  async merge(@Body() mergeDTO: MergeDTO) {
    this.logger.log(`[Merge] URL : ${mergeDTO.urls.join(' , ')}`)
    return await this.documentService.merge(mergeDTO);
  }

  @Post('/compress')
  async compress(@Body() compressDTO:CompressDTO){
    this.logger.log('[Compress] URL : ' + compressDTO.url )
    return await this.documentService.compress(compressDTO);
  }

  @Post('/split')
  async split(@Body() splitDTO:SplitDTO){
    this.logger.log('[Split] URL : ' + splitDTO.url + ' ' + '[pages] : ' + splitDTO.pages.join(','))
    return await this.documentService.split(splitDTO);
  }

}
