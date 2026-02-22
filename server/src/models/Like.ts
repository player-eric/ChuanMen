import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema(
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
        'comment',
      ],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  },
);

likeSchema.index({ entityType: 1, entityId: 1, userId: 1 }, { unique: true });
likeSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export type LikeDocument = mongoose.InferSchemaType<typeof likeSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LikeModel = mongoose.model('Like', likeSchema);
