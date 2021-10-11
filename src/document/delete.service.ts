import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { getS3 } from './s3';

@Injectable()
export class DeleteService {
  private readonly logger = new Logger(DeleteService.name);

  @Cron(CronExpression.EVERY_HOUR)
  deleteDocuments() {
    const s3 = getS3();

    //get files key from mongodb
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
