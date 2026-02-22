import mongoose from 'mongoose';

const experimentPairingSchema = new mongoose.Schema(
  {
    experimentId: { type: String, required: true, trim: true, index: true },
    userAId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userBId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    metAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

experimentPairingSchema.index({ experimentId: 1, userAId: 1, userBId: 1 }, { unique: true });

export type ExperimentPairingDocument = mongoose.InferSchemaType<typeof experimentPairingSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ExperimentPairingModel = mongoose.model('ExperimentPairing', experimentPairingSchema);
