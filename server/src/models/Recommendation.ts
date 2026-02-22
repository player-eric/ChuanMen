import mongoose from 'mongoose';

const recommendationSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['movie', 'recipe', 'music', 'place'],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '' },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sourceUrl: { type: String, default: '' },
    coverUrl: { type: String, default: '' },
    tags: { type: [String], default: [] },
    voteCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['candidate', 'featured', 'archived'],
      default: 'candidate',
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

recommendationSchema.index({ category: 1, createdAt: -1 });

export type RecommendationDocument = mongoose.InferSchemaType<typeof recommendationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const RecommendationModel = mongoose.model('Recommendation', recommendationSchema);
