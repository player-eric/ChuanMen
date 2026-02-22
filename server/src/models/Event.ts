import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    coHostIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    proposalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proposal',
      required: false,
      default: null,
    },
    titleImageUrl: { type: String, default: '' },
    description: { type: String, default: '' },
    houseRules: { type: String, default: '' },
    location: { type: String, default: '' },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: false, default: null },
    capacity: { type: Number, required: true, min: 1, max: 50, default: 10 },
    visibilityExcludedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    tag: {
      type: String,
      enum: ['movie', 'chuanmen', 'holiday', 'hiking', 'outdoor', 'small-group', 'other'],
      default: 'other',
      index: true,
    },
    phase: {
      type: String,
      enum: ['invite', 'open', 'closed'],
      default: 'invite',
      index: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    selectedMovieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: false,
      default: null,
    },
    recap: { type: String, default: '' },
    recapPhotoUrls: { type: [String], default: [] },
    recorderUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    waitlistEnabled: { type: Boolean, default: true },
    isWeeklyLotteryEvent: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

eventSchema.index({ startsAt: 1, phase: 1 });
eventSchema.index({ startsAt: -1, status: 1 });

export type EventDocument = mongoose.InferSchemaType<typeof eventSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const EventModel = mongoose.model('Event', eventSchema);
