import { Schema, model, type Document } from 'mongoose';

export interface IRefreshToken extends Document {
  token: string;
  user: Schema.Types.ObjectId;
  expiresAt: Date;
  revoked: boolean;
  rotatedAt?: Date | null;
  replacedBy?: string | null;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revoked: {
      type: Boolean,
      default: false,
    },
    // Set when the token is exchanged for a new one. `replacedBy` links to the
    // hash issued in its place, so a double-submitted rotation inside the grace
    // window can retire the orphaned copy instead of stranding the client.
    rotatedAt: {
      type: Date,
    },
    replacedBy: {
      type: String,
    },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ user: 1, revoked: 1 });

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
