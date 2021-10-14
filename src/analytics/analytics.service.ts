import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentModel } from 'src/document/model/document.model';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel('Documents') private documentModel: Model<DocumentModel>,
  ) {}

  async core(year: number, opration : string) {

    const builder = { `` : "$date" };
    
    const response = await this.documentModel.aggregate([
      {
        $group: {
          _id: { builder : '$date' },
          count: { $sum: 1 },
        },
      },
      {
        $project: { opration: '$_id', count: '$count', _id: 0 },
      },
    ]);

    return response
  }

  async analytics(year: number) {

  }

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


// ----------------------------------------------

db.documents.aggregate([
    {
        $group: {
            _id: {$year: "$date"}, 
            count   : {$sum: 1} 
        },
    },
    {
        $project: { year: '$_id' , count : "$count" , _id:0},
    },
])

// ----------------------------------------------

db.documents.aggregate([
    {
        $group: {
            _id: {$week: "$date"}, 
            count   : {$sum: 1} 
        },
    },
    {
        $project: { week: '$_id' , count : "$count" , _id:0},
    },
])

// ----------------------------------------------------


db.documents.aggregate([
    {
        $group: {
            _id: { $month: "$date"}, 
            count   : {$sum: 1} 
        },
    },
    {
        $project: {  month: '$_id' , count : "$count" , _id:0},
    },
])


// ----------------------------------------------------


db.documents.aggregate([
    {
        $group: {
            _id: {$dayOfMonth: "$date"}, 
            count   : {$sum: 1} 
        },
    },
    {
        $project: { day: '$_id' , count : "$count" , _id:0},
    },
])

// ----------------------------------------------------


db.documents.aggregate([
    {
        $group: {
            _id: {$hour: "$date"}, 
            count   : {$sum: 1} 
        },
    },
    {
        $project: { hour: '$_id' , count : "$count" , _id:0},
    },
])


// ----------------------------------------------------


db.documents.aggregate([
    {
        $group: {
            _id: {$minute: "$date"}, 
            count   : {$sum: 1} 
        },
    },
    {
        $project: { minute: '$_id' , count : "$count" , _id:0},
    },
])