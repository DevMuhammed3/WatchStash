import { API_BASE_URL } from "@/lib/auth";

export interface ShowcasePoster {
  id: number;
  title: string;
  mediaType: "movie" | "tv";
  posterUrl: string;
  year: number | null;
  voteAverage: number;
  voteCount: number;
}

interface ShowcaseResponseItem extends Omit<ShowcasePoster, "posterUrl"> {
  posterUrl: string | null;
}

/**
 * Public TMDB-backed selection for marketing surfaces. Returns an empty list
 * on any failure so the landing page can fall back to its static artwork
 * instead of failing to render.
 */
export async function getShowcasePosters(limit = 6): Promise<ShowcasePoster[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/media/showcase`, {
      next: { revalidate: 60 * 60 },
      // Never let a slow or unreachable API hold up the marketing page (or a
      // static build). The caller falls back to the built-in artwork.
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return [];

    const data = (await response.json()) as { results?: ShowcaseResponseItem[] };
    return (data.results ?? [])
      .filter(
        (item): item is ShowcaseResponseItem & { posterUrl: string } =>
          Boolean(item.posterUrl),
      )
      .slice(0, limit);
  } catch {
    return [];
  }
}
