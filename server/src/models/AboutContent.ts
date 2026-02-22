import mongoose from 'mongoose';

const aboutContentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['principle', 'host_guide', 'letter', 'about'],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    contentMd: { type: String, required: true },
    published: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

aboutContentSchema.index({ type: 1, updatedAt: -1 });

export type AboutContentDocument = mongoose.InferSchemaType<typeof aboutContentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AboutContentModel = mongoose.model('AboutContent', aboutContentSchema);
