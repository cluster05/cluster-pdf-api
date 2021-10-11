import { Document } from 'mongoose';

export class DocumentModel extends Document {
  keys: string[];
  timestamp: number;
  oprationStart: number;
  oprationEnd: number;
  failedReason: string;
  date: Date;
  ipInfo: object;
}
