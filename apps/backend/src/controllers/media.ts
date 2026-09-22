import type { Request, Response } from 'express';
import { DEFAULT_STATUS } from '@watchstash/types';
import type { MediaDetails, MediaType, Progress, ProviderId } from '@watchstash/types';
import { StashItem } from '../models/StashItem.js';
import { getProvider, tmdbProvider } from '../services/mediaProvider.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export function buildStashFields(
  details: MediaDetails,
  type: MediaType,
  progress?: Progress,
  imageUrl: (path: string | null, size?: string) => string | null = (path) => path,
): Record<string, unknown> {
  const isSeriesLike = type === 'series' || type === 'anime';
  return {
    title: details.title,
    type,
    posterUrl: imageUrl(details.posterPath),
    backdropUrl: imageUrl(details.backdropPath, 'w1280'),
    overview: details.overview,
    year: details.year ?? undefined,
    genres: details.genres.length > 0 ? details.genres : undefined,
    tmdbRating: details.voteAverage || undefined,
    tmdbVoteCount: details.voteCount || undefined,
    progress: {
      currentEpisode: 0,
      currentSeason: isSeriesLike ? (progress?.currentSeason ?? 1) : 1,
      totalEpisodes: isSeriesLike ? (details.episodes ?? progress?.totalEpisodes) : undefined,
    },
  };
}

export const searchMedia = asyncHandler(async (req: Request, res: Response) => {
  const query = String(req.query.query ?? '');
  const page = Number(req.query.page || 1);
  const response = await tmdbProvider.search(query, page);
  res.status(200).json({ status: 'success', ...response });
});

export const trendingMedia = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page || 1);
  const response = await tmdbProvider.trending(page);
  res.status(200).json({ status: 'success', ...response });
});

export const mediaDetails = asyncHandler(async (req: Request, res: Response) => {
  const provider = String(req.params.provider);
  const id = String(req.params.id);
  const mediaType =
    req.query.mediaType === 'tv' ? 'tv' : req.query.mediaType === 'movie' ? 'movie' : undefined;
  const mediaProvider = getProvider(provider as ProviderId);
  const details = await mediaProvider.details(id, mediaType);
  res.status(200).json({ status: 'success', details });
});

export const getStashItems = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(req.query.limit as string) || DEFAULT_PAGE_SIZE),
  );
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    StashItem.find({ userId: req.user!.id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    StashItem.countDocuments({ userId: req.user!.id }),
  ]);

  res.status(200).json({
    status: 'success',
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

export const createStashFromProvider = asyncHandler(async (req: Request, res: Response) => {
  const { provider, externalId, type, status, rating, review, tags, progress } = req.body;
  const userId = req.user!.id;

  const mediaProvider = getProvider(provider as ProviderId);
  const mediaType: MediaType = type ?? 'movie';
  const details = await mediaProvider.details(
    externalId,
    mediaType === 'movie' ? 'movie' : 'tv',
  );

  const existing = await StashItem.findOne({ userId, provider, externalId, type: mediaType });
  if (existing) {
    throw new AppError('This item is already in your stash', 409);
  }

  const item = await StashItem.create({
    userId,
    provider,
    externalId,
    status: status ?? DEFAULT_STATUS,
    rating,
    review,
    tags,
    ...buildStashFields(details, mediaType, progress, mediaProvider.imageUrl.bind(mediaProvider)),
  });

  res.status(201).json({ status: 'success', item });
});

export const updateStashItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await StashItem.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.id },
    { $set: req.body },
    { new: true, runValidators: true },
  );

  if (!item) {
    throw new AppError('Stash item not found', 404);
  }

  res.status(200).json({ status: 'success', item });
});

export const deleteStashItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await StashItem.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });

  if (!item) {
    throw new AppError('Stash item not found', 404);
  }

  res.status(200).json({ status: 'success', message: 'Stash item deleted' });
});