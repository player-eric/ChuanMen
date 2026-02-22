import mongoose from 'mongoose';

const seedCollaboratorSchema = new mongoose.Schema(
  {
    seedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seed',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    roleLabel: { type: String, default: '' },
    status: {
      type: String,
      enum: ['invited', 'active', 'rejected', 'left'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

seedCollaboratorSchema.index({ seedId: 1, userId: 1 }, { unique: true });

export type SeedCollaboratorDocument = mongoose.InferSchemaType<typeof seedCollaboratorSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SeedCollaboratorModel = mongoose.model('SeedCollaborator', seedCollaboratorSchema);
