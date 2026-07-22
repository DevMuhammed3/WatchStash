export type MediaType = "movie" | "series" | "anime";

export type MediaStatus = "watching" | "completed" | "on_hold" | "plan_to_watch";

export interface Progress {
  currentEpisode: number;
  totalEpisodes?: number;
  currentSeason: number;
}

export interface SocialProviders {
  googleId?: string;
  githubId?: string;
  facebookId?: string;
  twitterId?: string;
}

export interface MediaItem {
  _id: string;
  userId?: string;
  title: string;
  type: MediaType;
  status: MediaStatus;
  rating?: number;
  review?: string;
  progress: Progress;
  posterUrl?: string;
  externalId?: string;
  createdAt: string;
  updatedAt: string;
}

export type FilterStatus = MediaStatus | "all";

export type SortOption = "recent" | "rating" | "release";

export interface User {
  _id: string;
  username: string;
  displayName: string;
  email: string;
  bio: string;
  avatarUrl: string;
  providers: SocialProviders;
  followersCount: number;
  followingCount: number;
  createdAt: string;
  updatedAt: string;
}

export type UserProfile = Omit<User, "providers" | "followersCount" | "followingCount">;

export interface AuthPayload {
  id: string;
}

export interface RegisterInput {
  username: string;
  displayName: string;
  email: string;
  password: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  status: "success";
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface Movie {
  _id: string;
  userId: string;
  title: string;
  description: string;
  releaseYear?: number;
  genre: string[];
  watched: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMovieInput {
  title: string;
  description?: string;
  releaseYear?: number;
  genre?: string[];
  watched?: boolean;
}

export interface Follow {
  _id: string;
  follower: string;
  following: string;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  status: "success" | "error";
  message?: string;
  data?: T;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}
