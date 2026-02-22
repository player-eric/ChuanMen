import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    year: { type: Number, default: null },
    director: { type: String, default: '' },
    poster: { type: String, default: '' },
    doubanUrl: { type: String, default: '' },
    doubanRating: { type: Number, default: null },
    synopsis: { type: String, default: '' },
    recommendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['candidate', 'screened'],
      default: 'candidate',
      index: true,
    },
    screenedEventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

movieSchema.index({ status: 1, createdAt: -1 });

export type MovieDocument = mongoose.InferSchemaType<typeof movieSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const MovieModel = mongoose.model('Movie', movieSchema);
