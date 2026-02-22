import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: [
        'event',
        'movie',
        'proposal',
        'postcard',
        'seed',
        'seed_update',
        'discussion',
        'discussion_reply',
      ],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: { type: String, required: true, trim: true },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      required: false,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

commentSchema.index({ entityType: 1, entityId: 1, createdAt: 1 });

export type CommentDocument = mongoose.InferSchemaType<typeof commentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CommentModel = mongoose.model('Comment', commentSchema);
