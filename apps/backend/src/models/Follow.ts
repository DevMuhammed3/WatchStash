import { Schema, model, type Document } from 'mongoose';

export interface IFollow extends Document {
  follower: Schema.Types.ObjectId;
  following: Schema.Types.ObjectId;
  createdAt: Date;
}

const followSchema = new Schema<IFollow>(
  {
    follower: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    following: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1, follower: 1 });

export const Follow = model<IFollow>('Follow', followSchema);
