import mongoose from 'mongoose';

const eventSignupSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'waitlist', 'declined', 'cancelled'],
      default: 'invited',
      index: true,
    },
    invitedAt: { type: Date, default: null },
    respondedAt: { type: Date, default: null },
    participated: { type: Boolean, default: false },
    checkedInAt: { type: Date, default: null },
    note: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

eventSignupSchema.index({ eventId: 1, userId: 1 }, { unique: true });
eventSignupSchema.index({ eventId: 1, status: 1, createdAt: 1 });

export type EventSignupDocument = mongoose.InferSchemaType<typeof eventSignupSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const EventSignupModel = mongoose.model('EventSignup', eventSignupSchema);
