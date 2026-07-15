import { Schema, model, Document } from 'mongoose';

export interface IStashItem extends Document {
  userId: Schema.Types.ObjectId;
  title: string;
  type: 'movie' | 'series' | 'anime';
  status: 'watching' | 'completed' | 'on_hold' | 'plan_to_watch';
  rating?: number;
  review?: string;
  progress: {
    currentEpisode: number;
    totalEpisodes?: number;
    currentSeason: number;
  };
  posterUrl?: string;
  externalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const stashItemSchema = new Schema<IStashItem>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['movie', 'series', 'anime'],
      required: true,
    },
    status: {
      type: String,
      enum: ['watching', 'completed', 'on_hold', 'plan_to_watch'],
      required: true,
      default: 'plan_to_watch',
    },
    rating: {
      type: Number,
      min: 1,
      max: 10,
    },
    review: {
      type: String,
      trim: true,
    },
    progress: {
      currentEpisode: {
        type: Number,
        default: 0,
      },
      totalEpisodes: {
        type: Number,
      },
      currentSeason: {
        type: Number,
        default: 1,
      },
    },
    posterUrl: {
      type: String,
    },
    externalId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

stashItemSchema.index({ userId: 1 });
stashItemSchema.index({ userId: 1, status: 1 });
stashItemSchema.index({ userId: 1, type: 1 });

export const StashItem = model<IStashItem>('StashItem', stashItemSchema);
