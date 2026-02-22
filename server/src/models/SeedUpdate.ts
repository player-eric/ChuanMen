import mongoose from 'mongoose';

const seedUpdateSchema = new mongoose.Schema(
  {
    seedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seed',
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
    mediaUrls: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  },
);

seedUpdateSchema.index({ seedId: 1, createdAt: -1 });

export type SeedUpdateDocument = mongoose.InferSchemaType<typeof seedUpdateSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SeedUpdateModel = mongoose.model('SeedUpdate', seedUpdateSchema);
