import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConvertDTO } from './dto/convert.dto';
import { MergeDTO } from './dto/merge.dto';

import * as libre from 'libreoffice-convert';
import { appendFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { promisify } from 'bluebird';
import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import { S3 } from 'aws-sdk';

@Injectable()
export class DocumentService {

  async uplaod(file: Express.Multer.File) {
    
    const { originalname } = file;

    const fileSplit = originalname.split('.');
    const extension =  fileSplit[fileSplit.length -1];
    const filename = uuidv4() +'.'+extension;

    const bucketS3 = 'AWS_BUCKET_NAME';
    return await this.uplaodS3(file.buffer,bucketS3,filename);

  }

  async uplaodS3(file,bucket,filename:string){

     console.log('[document service] upalod s3  started');
     

      const s3 = this.getS3();
      const params = {
        Bucket:bucket,
        Key : filename,
        Body:file,
      }

      return new Promise((resolve,reject)=>{
        s3.upload(params,(err,data)=>{
          if(err){
            console.log('[document service] error',JSON.stringify(err));
            
            reject(err.message);
          }
          resolve({
            url : data,
          });
        })
        
      })

  }

  getS3() {
    return new S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
  }

  
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
      };
    } catch (err) {
      throw new HttpException(
        'error in converting the file.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

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
            'wrong [from] defined. please contact developer :)',
            HttpStatus.BAD_REQUEST,
          );
      }
      //
    } catch (err) {
      throw new HttpException(
        'error in converting the file.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  convertPdfToOffice(convertDTO: ConvertDTO) {
    throw new Error('Method not implemented.');
  }

  async convertPdfToImage(convertDTO: ConvertDTO) {
    throw new Error('Method not implemented.');
  }

  async convertOfficeToPdf(convertDTO: ConvertDTO) {
    const libreConvert = promisify(libre.convert);

    const buffer = await fetch(convertDTO.url).then((res: any) => res.buffer());

    const filename = uuidv4() + '.' + convertDTO.to;

    const outputPath = join(__dirname, './../documents/', filename);

    const done = await libreConvert(buffer, convertDTO.to, undefined);

    writeFileSync(outputPath, done);

    return {
      url: 'http://localhost:8080/document/' + filename,
    };
  }

  async convertImageTopdf(convertDTO: ConvertDTO) {
    const buffer = await fetch(convertDTO.url).then((res: any) => res.buffer());

    const pdfDoc = await PDFDocument.create();
    const image = await pdfDoc.embedJpg(buffer);

    const page = pdfDoc.addPage();
    page.drawImage(image, {});
    const pdfBytes = await pdfDoc.save();

    const filename = uuidv4() + '.pdf';
    const outputPath = join(__dirname, './../documents/', filename);

    appendFileSync(outputPath, pdfBytes);

    return {
      url: 'http://localhost:8080/document/' + filename,
    };
  }
}
