import { Injectable } from '@nestjs/common';
import { ConvertDTO } from './dto/convert.dto';
import { MergeDTO } from './dto/merge.dto';

@Injectable()
export class DocumentService {
  merge(mergeDTO: MergeDTO) {
      //code for merge pdf files
  }

  convert(convertDTO: ConvertDTO) {
    
    // code for convert the files from one to anather

  }

}
