import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticsService {
  /* 
    COUNTER FOR PROCESSING 
    db.documents.aggregate([
        { 
            $group : { 
                _id : "$opration",
                count: { $sum: 1 }
            } 
        },
        {
            $project: { opration: '$_id' , count : "$count" , _id:0},
        },
    ])

    
    */
}
