import mongoose from 'mongoose';

const userPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    pushEmail: { type: Boolean, default: true },
    pushFrequency: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
    },
    mutedGoals: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

export type UserPreferenceDocument = mongoose.InferSchemaType<typeof userPreferenceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UserPreferenceModel = mongoose.model('UserPreference', userPreferenceSchema);
