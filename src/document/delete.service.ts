import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { DocumentModel } from './model/document.model';
import { getS3 } from './s3';

@Injectable()
export class DeleteService {
  private readonly logger = new Logger(DeleteService.name);

  constructor(
    @InjectModel('Documents') private documentModel: Model<DocumentModel>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async deleteDocuments() {
    const s3 = getS3();

    /* 
    db.documents.aggregate([
    {
        $match:{
        isDeleted:false,
        timestamp: { $lt : 1634060768098 }
        }      
    },
    {
        $unwind:"$keys"
    },
    {
        $project:{ key : "$keys" , _id : 0 }
    }
    ])
    */

    const Objects = [
      // {Key: 'filename.ext'},
    ];

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Delete: {
        Objects,
      },
    };

    if (Objects.length > 0) {
      s3.deleteObjects(params, (err, data) => {
        if (err) {
          this.logger.error(err);
          return;
        }
        this.logger.verbose('Batch File deleted');
      });
    }
  }
}
