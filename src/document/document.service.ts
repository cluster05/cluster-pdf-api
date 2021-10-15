import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
import {
  OPERATION_MERGE,
  OPRATION_COMPRESS,
  OPRATION_CONVERT_IMAGE_TO_PDF,
  OPRATION_CONVERT_PDF_TO_IMAGE,
  OPRATION_SPLIT,
} from 'src/constant/upload.constant';
import {
  ERROR_COMPRESS,
  ERROR_CONVERT,
  ERROR_MERGE,
  ERROR_SPLIT,
} from 'src/constant/error.constant';
import { MAX_FILE_SIZE, FILE_SIZE_NUMBER } from 'src/constant/file.constant';

const libreConvert = promisify(convert);

@Injectable()
export class DocumentService {
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

  async upload(file: Express.Multer.File, req: any) {
    if (!file) {
      throw new HttpException(
        'File not found present.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new HttpException(
        `Sorry currently we are not accepting file size greater than ${FILE_SIZE_NUMBER}MB.`,
        HttpStatus.BAD_REQUEST,
      );
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
      throw new HttpException(
        error?.message ||
          'Error occured while uploading the file. Plase try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

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
      const mongoId = await this.mongoEndMulti(
        keys,
        mergeDTO.mongoId,
        OPERATION_MERGE,
      );

      return {
        ...response,
        mongoId,
      };
    } catch (error) {
      await this.mongoReason(ERROR_MERGE, error, mergeDTO.mongoId);
      throw new HttpException(
        'Error occured while merging the file. Plase try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

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
        OPRATION_SPLIT,
      );

      return {
        ...response,
        documentId,
      };
    } catch (error) {
      await this.mongoReason(ERROR_SPLIT, error, splitDTO.mongoId);
      throw new HttpException(
        'Error occured while spliting the file. Plase try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

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
        OPRATION_COMPRESS,
      );

      return {
        ...response,
        documentId,
      };
    } catch (error) {
      await this.mongoReason(ERROR_COMPRESS, error, compressDTO.mongoId);
      throw new HttpException(
        'Error occured while compressing the file. Plase try again.',
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
            'wrong request body data defined.',
            HttpStatus.BAD_REQUEST,
          );
      }
    } catch (error) {
      await this.mongoReason(ERROR_CONVERT, error, convertDTO.mongoId);
      throw new HttpException(
        error?.message ||
          'Error occured while converting the file. Plase try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async convertPdfToOffice(convertDTO: ConvertDTO) {}

  private async convertPdfToImage(convertDTO: ConvertDTO) {
    const buffer = await fetch(convertDTO.url).then((res: any) => res.buffer());
    const options = {
      density: 100,
      format: convertDTO.toType,
      width: 2480,
      height: 3508,
    };

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
      OPRATION_CONVERT_PDF_TO_IMAGE,
    );
    return {
      images: [...builder],
      mongoId,
    };
  }

  private async convertOfficeToPdf(convertDTO: ConvertDTO) {
    const opration = `CONVERT_${convertDTO.fromType.toUpperCase()}_TO_${convertDTO.toType.toUpperCase()}`;

    const buffer = await fetch(convertDTO.url).then((res: any) => res.buffer());

    const filename = uuidv4() + '.' + convertDTO.to;

    const done = await libreConvert(buffer, convertDTO.to, undefined);

    const response = await this.uploadS3(done, filename);
    const documentId = await this.mongoEnd(
      response,
      convertDTO.mongoId,
      opration,
    );

    return {
      ...response,
      documentId,
    };
  }

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

    const page = pdfDoc.addPage();
    page.drawImage(image, {});
    const pdfBytes = await pdfDoc.save();
    const buf = this.conversion(pdfBytes);
    const filename = uuidv4() + '.pdf';
    const response = await this.uploadS3(buf, filename);
    const documentId = await this.mongoEnd(
      response,
      convertDTO.mongoId,
      OPRATION_CONVERT_IMAGE_TO_PDF,
    );

    return {
      ...response,
      documentId,
    };
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

  private async mongoReason(
    failedOperation: string,
    failedReason: string,
    mongoId: string,
  ) {
    const oprationEnd = Date.now();

    const mongoOpration = await this.documentModel.findByIdAndUpdate(mongoId, {
      opration: failedOperation,
      oprationEnd,
      failedReason,
    });
    return mongoOpration._id;
  }
}
