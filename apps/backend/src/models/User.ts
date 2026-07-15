import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
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
  followers: Schema.Types.ObjectId[];
  following: Schema.Types.ObjectId[];
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
    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    following: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>('User', userSchema);
