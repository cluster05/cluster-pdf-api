import { HttpException, HttpStatus, Injectable, Res } from '@nestjs/common';
import { ConvertDTO } from './dto/convert.dto';
import { MergeDTO } from './dto/merge.dto';

import * as libre from 'libreoffice-convert';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { promisify } from 'bluebird';

@Injectable()
export class DocumentService {
  merge(mergeDTO: MergeDTO) {
    //code for merge pdf files
  }

  async convert(convertDTO: ConvertDTO) {
    try {
      const libreConvert = promisify(libre.convert);

      const inputPath = join(__dirname + './../documents/' + convertDTO.url);
      const filename = convertDTO.documentId + '.' + convertDTO.to;
      const outputPath = join(__dirname, './../documents/', filename);
      const file = readFileSync(inputPath);

      const done = await libreConvert(file, convertDTO.to, undefined);

      writeFileSync(outputPath, done);

      return {
        documentId: convertDTO.documentId,
        url: 'http://localhost:3000/document/' + filename,
      };
    } catch (err) {
      throw new HttpException(
        'error in converting the file.' + err,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
