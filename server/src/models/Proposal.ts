import mongoose from 'mongoose';

const proposalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '' },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    linkedEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: false,
      default: null,
    },
    status: {
      type: String,
      enum: ['discussing', 'scheduled', 'completed', 'cancelled'],
      default: 'discussing',
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

proposalSchema.index({ status: 1, createdAt: -1 });

export type ProposalDocument = mongoose.InferSchemaType<typeof proposalSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProposalModel = mongoose.model('Proposal', proposalSchema);
