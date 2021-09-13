import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { unlinkSync } from 'fs';
import { ConvertDTO } from './dto/convert.dto';
import { DocumentService } from './document.service';
import { MergeDTO } from './dto/merge.dto';

@Controller('document')
export class DocumentController {

  constructor(private documentService:DocumentService){}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(__dirname, '../documents/'),
        filename: (req, file, cb) => {
          const fileSplit = file.originalname.split('.');
          const fileExt = fileSplit[fileSplit.length - 1];
          const filename = uuidv4() + '.' + fileExt;
          cb(null, filename);
        },
      }),
    }),
  )
  createFile(@UploadedFile() file: Express.Multer.File) {
    return {
      url: 'http://localhost:3000/document/' + file.filename,
    };
  }

  @Get('/:document')
  getFile(@Param('document') document: string, @Res() res) {
    return res.sendFile(join(__dirname, '../documents/' + document));
  }

  @Delete('/:document')
  async deleteFile(@Param('document') document: string) {
    try {
      const path = join(__dirname + './../documents/' + document);
      await unlinkSync(path);
      return {
        message: 'file deleted sucessfully',
        statusCode: 200,
      };
    } catch (error) {
      throw new HttpException(
        'error occured while deleting file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/convert')
  convert(@Body() convertDTO:ConvertDTO){
    return this.documentService.convert(convertDTO)
  }

  @Post('merge')
  merge(@Body() mergeDTO:MergeDTO){
    return this.documentService.merge(mergeDTO)
  }
}
