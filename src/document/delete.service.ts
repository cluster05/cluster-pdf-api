import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { DocumentModel } from './model/document.model';
import { getS3 } from './s3';

@Injectable()
export class DeleteService {
  constructor(
    @InjectModel('Documents') private documentModel: Model<DocumentModel>,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async deleteDocuments() {
    const s3 = getS3();

    let lessThanOneHour = Date.now() - 3600000;
    const aggregateKeys = await this.aggregateDocumentKeys(lessThanOneHour);

    try {
      if (aggregateKeys.length > 0) {
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Delete: {
            Objects: aggregateKeys,
          },
        };

        if (aggregateKeys.length > 0) {
          s3.deleteObjects(params, async (err, data) => {
            if (err) {
              throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
            }
            await this.updateDeleteAndUnsetKeys(lessThanOneHour);
          });
        }
      }
    } catch (error) {
      const timestamp = Date.now();
      const mongo = {
        opration: 'ERROR_DELETE_DATA',
        error,
        isDeleted: true,
        timestamp,
      };

      await new this.documentModel(mongo).save();
    }
  }

  async aggregateDocumentKeys(lessThanOneHour: number) {
    return await this.documentModel.aggregate([
      {
        $match: {
          isDeleted: false,
          timestamp: { $lte: lessThanOneHour },
        },
      },
      {
        $unwind: '$keys',
      },
      {
        $project: { Key: '$keys', _id: 0 },
      },
    ]);
  }

  async updateDeleteAndUnsetKeys(lessThanOneHour: number) {
    await this.documentModel.updateMany(
      {
        isDeleted: false,
        timestamp: { $lte: lessThanOneHour },
      },
      [
        {
          $set: {
            isDeleted: true,
          },
        },
        {
          $unset: ['keys'],
        },
      ],
    );
  }
}
