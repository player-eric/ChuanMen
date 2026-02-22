import mongoose from 'mongoose';

const discussionReplySchema = new mongoose.Schema(
  {
    discussionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Discussion',
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parentReplyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiscussionReply',
      required: false,
      default: null,
    },
    content: { type: String, required: true, trim: true },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  },
);

discussionReplySchema.index({ discussionId: 1, createdAt: 1 });

export type DiscussionReplyDocument = mongoose.InferSchemaType<typeof discussionReplySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const DiscussionReplyModel = mongoose.model('DiscussionReply', discussionReplySchema);
