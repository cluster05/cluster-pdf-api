import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConvertDTO } from './dto/convert.dto';
import { MergeDTO } from './dto/merge.dto';

import { appendFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { promisify } from 'bluebird';
import { v4 as uuidv4 } from 'uuid';

import {convert} from 'libreoffice-convert';
import { PDFDocument, PDFImage } from 'pdf-lib';
import { fromBuffer } from 'pdf2pic';

import { SplitDTO } from './dto/split.dto';
import { CompressDTO } from './dto/compress.dto';

import { compress as cptCompress } from 'cluster-pdf-tools';

const libreConvert = promisify(convert);
@Injectable()
export class DocumentService {
  
  /* upload file without aws */
  async upload(file: Express.Multer.File) {

    if(!file){
      throw new HttpException("invalid file",HttpStatus.BAD_REQUEST);
    }

    const fileSplit = file.originalname.split('.');
    const fileExt = fileSplit[fileSplit.length - 1];
    const filename = uuidv4() + '.' + fileExt;
    const destination = join(__dirname , '../documents/',filename);
    
    try{  
      writeFileSync(destination,file.buffer);
      
      return {
        url: 'http://localhost:8080/document/' + filename,
        key: filename
      };
    }catch(error){
      throw new HttpException(JSON.stringify(error),HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  /* implemented 1 offer */
  async merge(mergeDTO: MergeDTO) {
    try {
      const pdfLoader: PDFDocument[] = [];

      await Promise.all(
        mergeDTO.urls.map(async (url) => {
          const buffer = await fetch(url).then((res) => res.arrayBuffer());
          const laoder = await PDFDocument.load(buffer);
          pdfLoader.push(laoder);
        }),
      );

      const mergedPdf = await PDFDocument.create();

      await Promise.all(
        pdfLoader.map(async (pdf) => {
          const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          pages.forEach((page) => mergedPdf.addPage(page));
        }),
      );
      const pdfBytes = await mergedPdf.save();

      const filename = uuidv4() + '.pdf';
      const outputPath = join(__dirname, './../documents/', filename);

      appendFileSync(outputPath, pdfBytes);

      return {
        url: 'http://localhost:8080/document/' + filename,
        key : filename
      };
    } catch (err) {
      throw new HttpException(
        'error in converting the file.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  
  }

  /* implemented 1 offer */
  async split(splitDTO :SplitDTO){

    const pagesToAdd = splitDTO.pages.map(p=>p - 1);

    try {

      const pdf = await fetch(splitDTO.url).then((res) => res.arrayBuffer());
      const getPdf = await PDFDocument.load(pdf);

      const newPDF = await PDFDocument.create();

      const pages = await newPDF.copyPages(getPdf, pagesToAdd );
      pages.forEach((page) => newPDF.addPage(page));

      const pdfBytes = await newPDF.save();

      const filename = uuidv4() + '.pdf';
      const outputPath = join(__dirname, './../documents/', filename);

      appendFileSync(outputPath, pdfBytes);

      return {
        url: 'http://localhost:8080/document/' + filename,
        key: filename
      };
    } catch (err) {
      throw new HttpException(
        'error in converting the file.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

  }
  
  //yet to implement  1 offer
  async compress(compressDTO:CompressDTO){

    try{

       const buffer = await fetch(compressDTO.url).then((res: any) => res.buffer());
        const compressBuffer = await cptCompress(buffer);
      
      const filename = uuidv4() + '.pdf';
      const outputPath = join(__dirname, './../documents/', filename);

      appendFileSync(outputPath, compressBuffer);

      return {
        url: 'http://localhost:8080/document/' + filename,
        key: filename
      };
    } catch (err) {
      console.log(err);
      throw new HttpException(
        'error in compressing the file.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

  
  }

  /* 
    implemented 4 offer
    yet to implement 4 offer
  */
  async convert(convertDTO: ConvertDTO) {
    try {
      switch (convertDTO.from + '_' + convertDTO.to) {
        case 'office_pdf':
          return await this.convertOfficeToPdf(convertDTO);
        case 'pdf_office':
          return await this.convertPdfToOffice(convertDTO);
        case 'image_pdf':
          return await this.convertImageTopdf(convertDTO);
        case 'pdf_image':
          return await this.convertPdfToImage(convertDTO);

        default:
          throw new HttpException(
            'wrong [to][from] defined.',
            HttpStatus.BAD_REQUEST,
          );
      }
    } catch (err) {
      console.log(err);
      
      throw new HttpException(
        'error in converting the file.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //yet to implement  3 offer
  private async convertPdfToOffice(convertDTO: ConvertDTO) {
  }

  //yet to implement 1 offer
  private async convertPdfToImage(convertDTO: ConvertDTO) {
    
    const buffer = await fetch(convertDTO.url).then((res: any) => res.buffer());

    const filename = uuidv4();
    const destination = join(__dirname , '../documents/')
    const options =  {
      density: 100,
      saveFilename: filename,
      savePath:destination,
      format: convertDTO.toType,
      width: 2480,
      height: 3508
    };
    
    try{
      let pages =convertDTO.pages;

      if(Array.isArray(pages)){
        if(pages.length == 0){
          throw new HttpException("invalid array",HttpStatus.BAD_REQUEST);
        }
      }

      if(typeof(pages)== 'undefined'){
        pages = -1;
      }

      const convetPdfToImage =await fromBuffer(buffer,options).bulk(pages,false);
      const builder : { url : string ; key : string , page : number }[] = [];

      convetPdfToImage.forEach(ele=>{
        builder.push({
          url: 'http://localhost:8080/document/' + ele.name,
          key : ele.name,
          page :ele.page
        })
      })

      return [
        ...builder
      ]
    
    }catch(error){
      console.log(error);
      
      throw new HttpException("error in converting file",HttpStatus.INTERNAL_SERVER_ERROR);
    }
     

  }

  /* implemented 3 offer */
  private async convertOfficeToPdf(convertDTO: ConvertDTO) {

    const buffer = await fetch(convertDTO.url).then((res: any) => res.buffer());

    const filename = uuidv4() + '.' + convertDTO.to;

    const outputPath = join(__dirname, './../documents/', filename);

    const done = await libreConvert(buffer, convertDTO.to, undefined);

    writeFileSync(outputPath, done);

    return {
      url: 'http://localhost:8080/document/' + filename,
      key : filename
    };
  }

  /* implemented 1 offer */
  private async convertImageTopdf(convertDTO: ConvertDTO) {

    const buffer = await fetch(convertDTO.url).then((res: any) => res.buffer());

    const pdfDoc = await PDFDocument.create();
    let image : PDFImage;
    if(convertDTO.fromType == 'jpg'){
      image = await pdfDoc.embedJpg( buffer);
    }else if(convertDTO.fromType=='png'){
      image = await pdfDoc.embedPng(buffer);
    }else{
      throw new HttpException("invalid file format",HttpStatus.BAD_REQUEST) 
    }

    const page = pdfDoc.addPage();
    page.drawImage(image, {});
    const pdfBytes = await pdfDoc.save();

    const filename = uuidv4() + '.pdf';
    const outputPath = join(__dirname, './../documents/', filename);

    appendFileSync(outputPath, pdfBytes);

    return {
      url: 'http://localhost:8080/document/' + filename,
      key:filename,
    };
  }
}
