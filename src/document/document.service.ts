import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConvertDTO } from './dto/convert.dto';
import { MergeDTO } from './dto/merge.dto';

import { promisify } from 'bluebird';
import { v4 as uuidv4 } from 'uuid';

import { convert } from 'libreoffice-convert';
import { PDFDocument, PDFImage } from 'pdf-lib';
import { fromBuffer } from 'pdf2pic';

import { SplitDTO } from './dto/split.dto';
import { CompressDTO } from './dto/compress.dto';

import { compress as cptCompress } from 'cluster-pdf-tools';

import { getS3 } from './s3';
import { DocumentType } from './dto/document.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentModel } from './model/document.model';

const libreConvert = promisify(convert);
@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectModel('Documents') private documentModel: Model<DocumentModel>,
  ) {}

  private async uploadS3(
    file: Buffer,
    filename: string,
  ): Promise<DocumentType> {
    const s3 = getS3();
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: filename,
      Body: file,
    };
    return new Promise((resolve, reject) => {
      s3.upload(params, (err, data) => {
        if (err) {
          this.logger.error(err);
          reject(err.message);
          return;
        }
        resolve({
          url: data.Location,
          key: data.Key,
        });
      });
    });
  }

  /* upload file without aws */
  async upload(file: Express.Multer.File, req: any) {
    if (!file) {
      throw new HttpException('invalid file', HttpStatus.BAD_REQUEST);
    }
    try {
      const fileSplit = file.originalname.split('.');
      const fileExt = fileSplit[fileSplit.length - 1];
      const filename = uuidv4() + '.' + fileExt;

      const response = await this.uploadS3(file.buffer, filename);
      const mongoId = await this.mongoStart(response, '');
      return {
        ...response,
        mongoId,
      };
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /* implemented 1 offer */
  async merge(mergeDTO: MergeDTO) {
    try {
      const pdfLoader: PDFDocument[] = [];

      await Promise.all(
        mergeDTO.urls.map(async (url, index) => {
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
      const buf = this.conversion(pdfBytes);

      const filename = uuidv4() + '.pdf';

      const response = await this.uploadS3(buf, filename);
      const keys = mergeDTO.keys.slice(0, mergeDTO.keys.length);
      const mongoId = await this.mongoEndMulti(keys, mergeDTO.mongoId, 'MERGE');

      return {
        ...response,
        mongoId,
      };
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(
        'error in converting the file.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /* implemented 1 offer */
  async split(splitDTO: SplitDTO) {
    const pagesToAdd = splitDTO.pages.map((p) => p - 1);

    try {
      const pdf = await fetch(splitDTO.url).then((res) => res.arrayBuffer());

      const getPdf = await PDFDocument.load(pdf);

      const newPDF = await PDFDocument.create();

      const pages = await newPDF.copyPages(getPdf, pagesToAdd);

      pages.forEach((page) => newPDF.addPage(page));

      const pdfBytes = await newPDF.save();
      const buf = this.conversion(pdfBytes);

      const filename = uuidv4() + '.pdf';

      const response = await this.uploadS3(buf, filename);
      const documentId = await this.mongoEnd(
        response,
        splitDTO.mongoId,
        'SPLIT',
      );

      return {
        ...response,
        documentId,
      };
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(
        'error in converting the file.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //yet to implement  1 offer
  async compress(compressDTO: CompressDTO) {
    try {
      const buffer = await fetch(compressDTO.url).then((res: any) =>
        res.buffer(),
      );
      const compressBuffer = await cptCompress(buffer);

      const filename = uuidv4() + '.pdf';

      const response = await this.uploadS3(compressBuffer, filename);
      const documentId = await this.mongoEnd(
        response,
        compressDTO.mongoId,
        'COMPRESS',
      );

      return {
        ...response,
        documentId,
      };
    } catch (error) {
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
          throw new HttpException(
            'wrong [to][from] defined.',
            HttpStatus.BAD_REQUEST,
          );
      }
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(
        'error in converting the file.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //yet to implement  3 offer
  private async convertPdfToOffice(convertDTO: ConvertDTO) {}

  // implemented 1 offer
  private async convertPdfToImage(convertDTO: ConvertDTO) {
    const buffer = await fetch(convertDTO.url).then((res: any) => res.buffer());
    const options = {
      density: 100,
      format: convertDTO.toType,
      width: 2480,
      height: 3508,
    };

    try {
      let pages = convertDTO.pages;

      if (Array.isArray(pages)) {
        if (pages.length == 0) {
          throw new HttpException('invalid array', HttpStatus.BAD_REQUEST);
        }
      }

      if (typeof pages == 'undefined') {
        pages = -1;
      }
      const convetPdfToImage = await fromBuffer(buffer, options).bulk(
        pages,
        true,
      );

      const builder: { url: string; key: string; page: number }[] = [];
      const keys = [];

      await Promise.all(
        convetPdfToImage.map(async (ele) => {
          let base64Data = ele.base64.replace(/^data:image\/png;base64,/, '');
          base64Data += base64Data.replace('+', ' ');
          const buffer = Buffer.from(base64Data, 'base64');
          const filename = uuidv4() + '.png';
          const response = await this.uploadS3(buffer, filename);
          keys.push(response.key);
          builder.push({
            url: response.url,
            key: filename,
            page: ele.page,
          });
        }),
      );

      const mongoId = await this.mongoEndMulti(
        keys,
        convertDTO.mongoId,
        'CONVERT_PDF_TO_IMAGE',
      );
      return {
        images: [...builder],
        mongoId,
      };
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(
        'error in converting file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /* implemented 3 offer */
  private async convertOfficeToPdf(convertDTO: ConvertDTO) {
    try {
      const buffer = await fetch(convertDTO.url).then((res: any) =>
        res.buffer(),
      );

      const filename = uuidv4() + '.' + convertDTO.to;

      const done = await libreConvert(buffer, convertDTO.to, undefined);

      const response = await this.uploadS3(done, filename);
      const documentId = await this.mongoEnd(
        response,
        convertDTO.mongoId,
        'CONVERT_OFFICE_TO_PDF',
      );

      return {
        ...response,
        documentId,
      };
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /* implemented 1 offer */
  private async convertImageTopdf(convertDTO: ConvertDTO) {
    const buffer = await fetch(convertDTO.url).then((res: any) => res.buffer());

    const pdfDoc = await PDFDocument.create();
    let image: PDFImage;
    if (convertDTO.fromType == 'jpg') {
      image = await pdfDoc.embedJpg(buffer);
    } else if (convertDTO.fromType == 'png') {
      image = await pdfDoc.embedPng(buffer);
    } else {
      throw new HttpException('invalid file format', HttpStatus.BAD_REQUEST);
    }

    try {
      const page = pdfDoc.addPage();
      page.drawImage(image, {});
      const pdfBytes = await pdfDoc.save();
      const buf = this.conversion(pdfBytes);
      const filename = uuidv4() + '.pdf';
      const response = await this.uploadS3(buf, filename);
      const documentId = await this.mongoEnd(
        response,
        convertDTO.mongoId,
        'CONVERT_IMAGE_TO_PDF',
      );

      return {
        ...response,
        documentId,
      };
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private conversion(file: Uint8Array) {
    var buf = Buffer.alloc(file.byteLength);
    var view = new Uint8Array(file);
    for (var i = 0; i < buf.length; ++i) {
      buf[i] = view[i];
    }
    return buf;
  }

  private async mongoStart(response: DocumentType, ip: string) {
    const mongo = {
      keys: [response.key],
      timestamp: Date.now(),
      oprationStart: Date.now(),
      oprationEnd: Date.now(),
      failedReason: '',
      date: new Date(),
      ipInfo: {},
    };
    const mongoOpration = await new this.documentModel(mongo).save();

    return mongoOpration._id;
  }

  private async mongoEnd(
    response: DocumentType,
    mongoId: string,
    opration: string,
  ) {
    const oprationEnd = Date.now();

    const mongoOpration = await this.documentModel.findByIdAndUpdate(mongoId, {
      oprationEnd,
      opration,
      $push: { keys: response.key },
    });
    return mongoOpration._id;
  }

  private async mongoEndMulti(
    response: string[],
    mongoId: string,
    opration: string,
  ) {
    const oprationEnd = Date.now();

    const mongoOpration = await this.documentModel.findByIdAndUpdate(mongoId, {
      oprationEnd,
      opration,
      $push: { keys: { $each: response } },
    });
    return mongoOpration._id;
  }

  private async mongoReason(failedReason: string, mongoId: string) {
    const oprationEnd = Date.now();

    const mongoOpration = await this.documentModel.findByIdAndUpdate(mongoId, {
      oprationEnd,
      failedReason,
    });
    return mongoOpration._id;
  }
}
