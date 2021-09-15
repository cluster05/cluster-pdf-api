import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConvertDTO } from './dto/convert.dto';
import { MergeDTO } from './dto/merge.dto';

import * as libre from 'libreoffice-convert';
import { appendFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { promisify } from 'bluebird';
import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

if (!globalThis.fetch) {
  globalThis.fetch = fetch;
}

@Injectable()
export class DocumentService {
  async merge(mergeDTO: MergeDTO) {
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

    const filename = 'merge_' + uuidv4() + '.pdf';
    const outputPath = join(__dirname, './../documents/', filename);

    appendFileSync(outputPath, pdfBytes);
    return {
      url: 'http://localhost:3000/document/' + filename,
    };
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
