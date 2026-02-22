import mongoose from 'mongoose';

const seedSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '' },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'cancelled'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

seedSchema.index({ status: 1, updatedAt: -1 });

export type SeedDocument = mongoose.InferSchemaType<typeof seedSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SeedModel = mongoose.model('Seed', seedSchema);
