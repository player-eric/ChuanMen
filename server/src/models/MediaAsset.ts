import mongoose from 'mongoose';

const mediaAssetSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    contentType: { type: String, required: true, trim: true },
    fileSize: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'uploaded'],
      default: 'pending',
    },
    url: { type: String, required: true },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

export const MediaAssetModel = mongoose.model('MediaAsset', mediaAssetSchema);
