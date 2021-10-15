import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentModel } from 'src/document/model/document.model';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel('Documents') private documentModel: Model<DocumentModel>,
  ) {}

  async analytics() {
    try {
      const analytic = {
        y: await this._year(),
        w: await this._weeks(),
        m: await this._months(),
        d: await this._dayOfMonth(),
        h: await this._hour(),
        isDeleted: await this._isDeleted(),
        failed: await this._failed(),
        opration: await this._oprationAnalytics(),
      };
      return analytic;
    } catch (error) {
      console.log(error);
      throw new HttpException(
        'Error in getting analytics data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async _failed() {
    return await this.documentModel.aggregate([
      {
        $match: { failedReason: { $exists: true, $ne: '' } },
      },
    ]);
  }

  private async _isDeleted() {
    return await this.documentModel.aggregate([
      {
        $group: {
          _id: '$isDeleted',
          count: { $sum: 1 },
        },
      },
      {
        $project: { isDeleted: '$_id', count: '$count', _id: 0 },
      },
    ]);
  }

  async _year() {
    return await this.documentModel.aggregate([
      {
        $group: {
          _id: { $year: '$date' },
          count: { $sum: 1 },
        },
      },
      {
        $project: { year: '$_id', count: '$count', _id: 0 },
      },
    ]);
  }

  private async _weeks() {
    return await this.documentModel.aggregate([
      {
        $group: {
          _id: { $week: '$date' },
          count: { $sum: 1 },
        },
      },
      {
        $project: { week: '$_id', count: '$count', _id: 0 },
      },
    ]);
  }

  private async _months() {
    return await this.documentModel.aggregate([
      {
        $group: {
          _id: { $month: '$date' },
          count: { $sum: 1 },
        },
      },
      {
        $project: { month: '$_id', count: '$count', _id: 0 },
      },
    ]);
  }

  private async _dayOfMonth() {
    return await this.documentModel.aggregate([
      {
        $group: {
          _id: { $dayOfMonth: '$date' },
          count: { $sum: 1 },
        },
      },
      {
        $project: { day: '$_id', count: '$count', _id: 0 },
      },
    ]);
  }

  private async _hour() {
    return await this.documentModel.aggregate([
      {
        $group: {
          _id: { $hour: '$date' },
          count: { $sum: 1 },
        },
      },
      {
        $project: { hour: '$_id', count: '$count', _id: 0 },
      },
    ]);
  }

  private async _oprationAnalytics() {
    return await this.documentModel.aggregate([
      {
        $group: {
          _id: '$opration',
          count: { $sum: 1 },
        },
      },
      {
        $project: { opration: '$_id', count: '$count', _id: 0 },
      },
    ]);
  }
}
