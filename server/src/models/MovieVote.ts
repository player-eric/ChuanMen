import mongoose from 'mongoose';

const movieVoteSchema = new mongoose.Schema(
  {
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
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

movieVoteSchema.index({ movieId: 1, userId: 1 }, { unique: true });

export type MovieVoteDocument = mongoose.InferSchemaType<typeof movieVoteSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const MovieVoteModel = mongoose.model('MovieVote', movieVoteSchema);
