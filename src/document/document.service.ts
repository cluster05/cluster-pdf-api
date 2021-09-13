import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConvertDTO } from './dto/convert.dto';
import { MergeDTO } from './dto/merge.dto';

import { v4 as uuidv4 } from 'uuid';

import * as libre from 'libreoffice-convert';
import { readFileSync , writeFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class DocumentService {
  merge(mergeDTO: MergeDTO) {
      //code for merge pdf files
  }

  convert(convertDTO: ConvertDTO) {

    const inputPath = join(__dirname , './../documents/' + convertDTO.url)

    const file = readFileSync(inputPath)
    
    const split = convertDTO.url.split('.')

    libre.convert(file,convertDTO.to,undefined,(err,done)=>{
      if(err){
        throw new HttpException(
          'error occured while converting file',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      const outputPath = join(__dirname, './../documents/converted' + uuidv4() + '.'+split[split.length-1])
      try{

        writeFileSync(outputPath,done)
        return {
          url : outputPath  
        }
      }catch(err){
        throw new HttpException(
          'error occured while converting file. Contact develper :)',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
         
      }

    })
    // code for convert the files from one to anather

  }

}
