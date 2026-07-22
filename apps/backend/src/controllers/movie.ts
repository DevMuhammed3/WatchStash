import type { Request, Response } from 'express';
import { Movie } from '../models/Movie';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export const addMovie = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, releaseYear, genre, watched } = req.body;

  const movie = await Movie.create({
    userId: req.user!.id,
    title,
    description,
    releaseYear,
    genre,
    watched,
  });

  res.status(201).json({ status: 'success', movie });
});

export const getMovies = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(req.query.limit as string) || DEFAULT_PAGE_SIZE),
  );
  const skip = (page - 1) * limit;

  const [movies, total] = await Promise.all([
    Movie.find({ userId: req.user!.id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Movie.countDocuments({ userId: req.user!.id }),
  ]);

  res.status(200).json({
    status: 'success',
    movies,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

export const toggleWatched = asyncHandler(async (req: Request, res: Response) => {
  const movie = await Movie.findOne({ _id: req.params.id, userId: req.user!.id });

  if (!movie) {
    throw new AppError('Movie not found', 404);
  }

  movie.watched = !movie.watched;
  await movie.save();

  res.status(200).json({ status: 'success', movie });
});

export const deleteMovie = asyncHandler(async (req: Request, res: Response) => {
  const movie = await Movie.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });

  if (!movie) {
    throw new AppError('Movie not found', 404);
  }

  res.status(200).json({ status: 'success', message: 'Movie deleted' });
});
