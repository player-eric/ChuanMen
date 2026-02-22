import mongoose from 'mongoose';

const proposalVoteSchema = new mongoose.Schema(
  {
    proposalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proposal',
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

proposalVoteSchema.index({ proposalId: 1, userId: 1 }, { unique: true });

export type ProposalVoteDocument = mongoose.InferSchemaType<typeof proposalVoteSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProposalVoteModel = mongoose.model('ProposalVote', proposalVoteSchema);
