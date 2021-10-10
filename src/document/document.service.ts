import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConvertDTO } from './dto/convert.dto';
import { MergeDTO } from './dto/merge.dto';

import { promisify } from 'bluebird';
import { v4 as uuidv4 } from 'uuid';

import {convert} from 'libreoffice-convert';
import { PDFDocument, PDFImage } from 'pdf-lib';
import { fromBuffer } from 'pdf2pic';

import { SplitDTO } from './dto/split.dto';
import { CompressDTO } from './dto/compress.dto';

import { compress as cptCompress } from 'cluster-pdf-tools';

import { getS3 } from './s3';


const libreConvert = promisify(convert);
@Injectable()
export class DocumentService {

  private readonly logger = new Logger(DocumentService.name);

  private async uploadS3(file: Buffer ,filename :string){
      this.logger.log('[Upload S3] Started');
      const s3 = getS3();      
      const params = {
        Bucket : process.env.AWS_BUCKET_NAME,
        Key: filename,
        Body:file
      }
      return new Promise((resolve,reject)=>{
        s3.upload(params,(err,data)=>{
          if(err){
            this.logger.warn('[Upload S3] Failed');
            this.logger.error(err);
            reject(err.message);
            return
          }
          this.logger.log('[Upload S3] Success');          
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
      this.logger.warn("[upalod] Invalid File Error")
      throw new HttpException("invalid file",HttpStatus.BAD_REQUEST);
    }
  try{  
   
    const fileSplit = file.originalname.split('.');
    const fileExt = fileSplit[fileSplit.length - 1];
    const filename = uuidv4() + '.' + fileExt;

    return await this.uploadS3(file.buffer,filename) 
       
    }catch(error){
      this.logger.warn("[Upload] Error ")
      this.logger.error(error);
      throw new HttpException(error,HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  /* implemented 1 offer */
  async merge(mergeDTO: MergeDTO) {
    this.logger.log("[Merge] Started ")

    try {
      const pdfLoader: PDFDocument[] = [];

      this.logger.log("[Merge] Loading files stated")
      await Promise.all(
        mergeDTO.urls.map(async (url,index) => {
          this.logger.log("[Merge] Loading buffer file : " + index )
          const buffer = await fetch(url).then((res) => res.arrayBuffer());
          this.logger.log("[Merge] Buffer Loaded for file : " + index )
          const laoder = await PDFDocument.load(buffer);
          pdfLoader.push(laoder);
        }),
      );
      this.logger.log("[Merge] Loading files done")

      const mergedPdf = await PDFDocument.create();
      
      this.logger.log("[Merge] Merging stated")

      await Promise.all(
        pdfLoader.map(async (pdf) => {
          const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          pages.forEach((page) => mergedPdf.addPage(page));
        }),
      );
      const pdfBytes = await mergedPdf.save();
      const buf = this.conversion(pdfBytes);
      this.logger.log("[Merge] Merging done")
      
      const filename = uuidv4() + '.pdf';
      
      return await this.uploadS3(buf,filename);

    } catch (error) {    
      this.logger.warn("[Merge] Error ")
      this.logger.error(error); 
      throw new HttpException(
        'error in converting the file.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  
  }

  /* implemented 1 offer */
  async split(splitDTO :SplitDTO){
    this.logger.log("[Split] stated")

    const pagesToAdd = splitDTO.pages.map(p=>p - 1);

    try {

      this.logger.log("[Split] Buffer Loading")

      const pdf = await fetch(splitDTO.url).then((res) => res.arrayBuffer());
      this.logger.log("[Split] Buffer Loading Done")
      
      const getPdf = await PDFDocument.load(pdf);

      const newPDF = await PDFDocument.create();

      const pages = await newPDF.copyPages(getPdf, pagesToAdd );

      pages.forEach((page) => newPDF.addPage(page));

      const pdfBytes = await newPDF.save();
      const buf = this.conversion(pdfBytes);

      this.logger.log("[Split] Spliting done.")

      const filename = uuidv4() + '.pdf';
      

      return await this.uploadS3(buf,filename);

    } catch (error) {
      this.logger.warn("[Split] Error ")
      this.logger.error(error);
      throw new HttpException(
        'error in converting the file.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

  }
  
  //yet to implement  1 offer
  async compress(compressDTO:CompressDTO){
    this.logger.log("[Compress] stated")

    try{
    this.logger.log("[Compress] Buffer Loading")

      const buffer = await fetch(compressDTO.url).then((res: any) => res.buffer());
      this.logger.log("[Compress] Buffer Loading done")
      
      this.logger.log("[Compress] Compressing Stated")

      const compressBuffer = await cptCompress(buffer);

      this.logger.log("[Compress] Compressing Done")

      const filename = uuidv4() + '.pdf';
      
      return await this.uploadS3(compressBuffer,filename);

    } catch (error) {
      this.logger.warn("[Compress] Error ")
      this.logger.error(error);
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
          this.logger.warn('wrong [to][from] defined')
          throw new HttpException(
            'wrong [to][from] defined.',
            HttpStatus.BAD_REQUEST,
          );
      }
    } catch (error) {
      this.logger.warn('[Convert] Error')
      this.logger.error(error);
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
    
    this.logger.log('[ConvertPdfToImage] Stated')    
    const buffer = await fetch(convertDTO.url).then((res: any) => res.buffer());
    this.logger.log('[ConvertPdfToImage] Buffer loaded')    

    const options =  {
      density: 100,
      format: convertDTO.toType,
      width: 2480,
      height: 3508
    };
  
    this.logger.log('[ConvertPdfToImage] Options for converting files ')
    this.logger.log(options);    

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
      const convetPdfToImage =await fromBuffer(buffer,options).bulk(pages,true);

      const builder : { url : string ; key : string , page : number }[] = [];
      
      this.logger.log('[ConvertPdfToImage] Processing...')    
      await Promise.all(
      convetPdfToImage.map(async (ele) => {
          let base64Data  = ele.base64.replace(/^data:image\/png;base64,/, "");
          base64Data  +=  base64Data.replace('+', ' ');
          const buffer  =   Buffer.from(base64Data, 'base64');
          const filename = uuidv4()+'.png';
          const response = await this.uploadS3(buffer,filename) as any;
          
          builder.push({
            url: response.url,
            key:filename,
            page : ele.page
          });

        }),
      );

      this.logger.log('[ConvertPdfToImage] Processing sucess')    

      return [
        ...builder
      ]
    
    }catch(error){
      this.logger.warn('[ConvertPdfToImage] Error ')
      this.logger.error(error)
      throw new HttpException("error in converting file",HttpStatus.INTERNAL_SERVER_ERROR);
    }
     

  }

  /* implemented 3 offer */
  private async convertOfficeToPdf(convertDTO: ConvertDTO) {

    try{

      this.logger.log('[ConvertOfficeToPdf] Stated')
      
      const buffer = await fetch(convertDTO.url).then((res: any) => res.buffer());
      
      this.logger.log('[ConvertOfficeToPdf] buffer loaded')
      
      const filename = uuidv4() + '.' + convertDTO.to;
      
      const done = await libreConvert(buffer, convertDTO.to, undefined);
      
      return await this.uploadS3(done,filename);

    }catch(error){
      this.logger.warn("[ConvertOfficeToPdf] Error ")
      this.logger.error(error);
      throw new HttpException(error,HttpStatus.INTERNAL_SERVER_ERROR);
    }

  }

  /* implemented 1 offer */
  private async convertImageTopdf(convertDTO: ConvertDTO) {

    this.logger.log('[ConvertImageToPdf] Stated')
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

    try{

      const page = pdfDoc.addPage();
      page.drawImage(image, {});
      const pdfBytes = await pdfDoc.save();
      const buf = this.conversion(pdfBytes);
      const filename = uuidv4() + '.pdf';
      return await this.uploadS3(buf,filename);
    
    }catch(error){
      this.logger.warn("[ConvertImageToPdf] Error ")
      this.logger.error(error);
      throw new HttpException(error,HttpStatus.INTERNAL_SERVER_ERROR);
    
    }
  }

  private conversion(file :Uint8Array){
    var buf = Buffer.alloc(file.byteLength);
    var view = new Uint8Array(file);
    for (var i = 0; i < buf.length; ++i) {
        buf[i] = view[i];
    }
    return buf;
  }

}
