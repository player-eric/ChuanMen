import mongoose from 'mongoose';

const postcardSchema = new mongoose.Schema(
  {
    fromId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    toId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: false,
      default: null,
    },
    message: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'private',
      index: true,
    },
    photoUrl: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  },
);

postcardSchema.index({ toId: 1, createdAt: -1 });
postcardSchema.index({ fromId: 1, createdAt: -1 });

export type PostcardDocument = mongoose.InferSchemaType<typeof postcardSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PostcardModel = mongoose.model('Postcard', postcardSchema);
