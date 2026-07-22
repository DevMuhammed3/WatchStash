import { Schema, model, type Document } from 'mongoose';

export interface IMovie extends Document {
  userId: Schema.Types.ObjectId;
  title: string;
  description: string;
  releaseYear: number;
  genre: string[];
  watched: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const movieSchema = new Schema<IMovie>(
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
    description: {
      type: String,
      default: '',
      trim: true,
    },
    releaseYear: {
      type: Number,
    },
    genre: {
      type: [String],
      default: [],
    },
    watched: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

movieSchema.index({ userId: 1 });

export const Movie = model<IMovie>('Movie', movieSchema);
