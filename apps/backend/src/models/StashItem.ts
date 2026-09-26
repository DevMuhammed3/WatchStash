import { Schema, model, Document } from 'mongoose';
import { DEFAULT_STATUS, STATUS_ORDER } from '@watchstash/types';
import type { MediaType, MediaStatus, Progress, ProviderId } from '@watchstash/types';

export interface IStashItem extends Document {
  userId: Schema.Types.ObjectId;
  title: string;
  type: MediaType;
  status: MediaStatus;
  rating?: number;
  review?: string;
  progress: Progress;
  posterUrl?: string;
  provider?: ProviderId;
  externalId?: string;
  overview?: string;
  year?: number;
  backdropUrl?: string;
  genres?: string[];
  tmdbRating?: number;
  tmdbVoteCount?: number;
  tags?: string[];
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
      enum: STATUS_ORDER,
      required: true,
      default: DEFAULT_STATUS,
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
    provider: {
      type: String,
      enum: ['tmdb'],
    },
    externalId: {
      type: String,
    },
    overview: {
      type: String,
      trim: true,
    },
    year: {
      type: Number,
    },
    backdropUrl: {
      type: String,
    },
    genres: {
      type: [String],
      default: undefined,
    },
    tmdbRating: {
      type: Number,
      min: 0,
      max: 10,
    },
    tmdbVoteCount: {
      type: Number,
    },
    tags: {
      type: [String],
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

stashItemSchema.index({ userId: 1 });
stashItemSchema.index({ userId: 1, status: 1 });
stashItemSchema.index({ userId: 1, type: 1 });

export const StashItem = model<IStashItem>('StashItem', stashItemSchema);
