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

import { S3 } from 'aws-sdk';


const libreConvert = promisify(convert);
@Injectable()
export class DocumentService {

  private getS3() {
    return new S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
  }

  private async uploadS3(file:Buffer | Uint8Array,filename :string){

      const s3 = this.getS3();
      const params = {
        Bucket : process.env.AWS_BUCKET_NAME,
        Key: filename,
        Body:file
      }
      return new Promise((resolve,reject)=>{
        s3.upload(params,(err,data)=>{
          if(err){
            reject(err.message);
          }
          resolve({
            url: data.Location,
            key: data.Key
          });
        })
      })

  }
  
  /* upload file without aws */
  async upload(file: Express.Multer.File) {

    if(!file){
      throw new HttpException("invalid file",HttpStatus.BAD_REQUEST);
    }

  try{  
   
    const fileSplit = file.originalname.split('.');
    const fileExt = fileSplit[fileSplit.length - 1];
    const filename = uuidv4() + '.' + fileExt;

    return await this.uploadS3(file.buffer,filename) 
       
    }catch(error){
      throw new HttpException(error,HttpStatus.INTERNAL_SERVER_ERROR);
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
      
      return await this.uploadS3(pdfBytes,filename);

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
      
      return await this.uploadS3(pdfBytes,filename);

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
      
      return await this.uploadS3(compressBuffer,filename);

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

  // implemented 1 offer
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

    const done = await libreConvert(buffer, convertDTO.to, undefined);

    return await this.uploadS3(done,filename);
    
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
    return await this.uploadS3(pdfBytes,filename);
  }
}
