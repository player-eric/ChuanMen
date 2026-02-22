import mongoose from 'mongoose';

const agentPushSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
      index: true,
    },
    goal: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['email', 'web', 'feed'],
      required: true,
      index: true,
    },
    content: { type: String, required: true },
    actionUrl: { type: String, default: '' },
    isApproved: { type: Boolean, default: false, index: true },
    sentAt: { type: Date, default: null, index: true },
    opened: { type: Boolean, default: false },
    acted: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

agentPushSchema.index({ channel: 1, sentAt: -1 });
agentPushSchema.index({ userId: 1, createdAt: -1 });

export type AgentPushDocument = mongoose.InferSchemaType<typeof agentPushSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AgentPushModel = mongoose.model('AgentPush', agentPushSchema);
