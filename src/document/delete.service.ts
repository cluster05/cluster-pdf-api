import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { S3 } from 'aws-sdk';

@Injectable()
export class DeleteService {

    private readonly logger = new Logger(DeleteService.name);

    private getS3() {
        return new S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        });
    }
      
    @Cron(CronExpression.EVERY_HOUR)
    deleteDocuments(){
      this.logger.log('[DELETE S3] Started');
      const s3 = this.getS3(); 
      
      //get files key from mongodb
      const Objects = [
            // {Key: 'filename.ext'},
        ]
        
      const params = {
        Bucket : process.env.AWS_BUCKET_NAME,
        Delete: {
            Objects
        }
      }

      if(Objects.length > 0){

        s3.deleteObjects(params,(err,data)=>{
            if(err){
                this.logger.warn('[DELETE S3] Failed');
                this.logger.error(err);
                return
            }
            
            this.logger.log("******File Batch Deleted******")

        })
      }
    }

}