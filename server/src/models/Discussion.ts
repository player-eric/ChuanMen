import mongoose from 'mongoose';

const discussionSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

discussionSchema.index({ createdAt: -1 });

export type DiscussionDocument = mongoose.InferSchemaType<typeof discussionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const DiscussionModel = mongoose.model('Discussion', discussionSchema);
