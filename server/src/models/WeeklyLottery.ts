import mongoose from 'mongoose';

const weeklyLotterySchema = new mongoose.Schema(
  {
    weekKey: { type: String, required: true, unique: true, trim: true },
    weekNumber: { type: Number, required: true },
    drawnMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'completed', 'skipped'],
      default: 'pending',
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: false,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

weeklyLotterySchema.index({ createdAt: -1 });

export type WeeklyLotteryDocument = mongoose.InferSchemaType<typeof weeklyLotterySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WeeklyLotteryModel = mongoose.model('WeeklyLottery', weeklyLotterySchema);
