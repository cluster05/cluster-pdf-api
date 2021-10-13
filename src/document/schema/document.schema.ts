import { Schema } from 'mongoose';

export const DocumentSchema = new Schema(
  {
    keys: {
      type: [String],
      required: true,
    },
    timestamp: {
      type: Number,
      required: true,
    },
    oprationStart: {
      type: Number,
      required: true,
    },
    oprationEnd: {
      type: Number,
    },
    failedReason: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      required: true,
    },
    ipInfo: {
      type: Object,
      required: true,
    },
    opration: {
      type: String,
      default: 'DEFAULT',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { versionKey: false },
);
