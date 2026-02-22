import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    role: { type: String, default: 'member' },
    city: { type: String, default: '' },
    hostCount: { type: Number, default: 0 },
    participationCount: { type: Number, default: 0 },
    proposalCount: { type: Number, default: 0 },
    postcardSentCount: { type: Number, default: 0 },
    postcardReceivedCount: { type: Number, default: 0 },
    membershipStatus: {
      type: String,
      enum: ['contributor', 'regular'],
      default: 'regular',
    },
    operatorRoles: { type: [String], default: [] },
    socialTitles: { type: [String], default: [] },
    lastActiveAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

export type UserDocument = mongoose.InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UserModel = mongoose.model('User', userSchema);
