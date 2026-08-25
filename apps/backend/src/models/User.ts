import { Schema, model, Document, Types } from 'mongoose';
import { Movie } from './Movie.js';
import { StashItem } from './StashItem.js';
import { RefreshToken } from './RefreshToken.js';
import { Follow } from './Follow.js';

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  displayName: string;
  email: string;
  passwordHash?: string;
  hasPassword: boolean;
  bio: string;
  avatarUrl: string;
  providers: {
    googleId?: string;
    githubId?: string;
    facebookId?: string;
    twitterId?: string;
  };
  followersCount: number;
  followingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: false,
    },
    hasPassword: {
      type: Boolean,
      required: true,
      default: false,
    },
    bio: {
      type: String,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    providers: {
      googleId: { type: String, sparse: true },
      githubId: { type: String, sparse: true },
      facebookId: { type: String, sparse: true },
      twitterId: { type: String, sparse: true },
    },
    followersCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  const userId = this._id;
  await Promise.all([
    Movie.deleteMany({ userId }),
    StashItem.deleteMany({ userId }),
    RefreshToken.deleteMany({ user: userId }),
    Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] }),
  ]);
  next();
});

export const User = model<IUser>('User', userSchema);
