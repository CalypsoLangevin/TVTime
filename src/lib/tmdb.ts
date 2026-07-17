const BASE = 'https://api.themoviedb.org/3';
const KEY = import.meta.env.VITE_TMDB_API_KEY ?? '';

export const IMG_BASE = 'https://image.tmdb.org/t/p';

export function posterUrl(path: string | null, size: 'w185' | 'w342' | 'w500' = 'w342') {
  if (!path) return null;
  return `${IMG_BASE}/${size}${path}`;
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('api_key', KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
  return res.json();
}

export const tmdb = {
  searchMulti: (query: string) =>
    get<{ results: Array<{ media_type: string } & Record<string, unknown>> }>('/search/multi', { query }),

  searchMovies: (query: string) =>
    get<{ results: unknown[] }>('/search/movie', { query }),

  searchShows: (query: string) =>
    get<{ results: unknown[] }>('/search/tv', { query }),

  movie: (id: number) =>
    get<{ id: number; title: string; poster_path: string | null; release_date: string; overview: string; runtime: number | null; vote_average: number; genres: { id: number; name: string }[] }>(`/movie/${id}`),

  show: (id: number) =>
    get<import('../types').TMDBShowDetails>(`/tv/${id}`),

  season: (showId: number, seasonNumber: number) =>
    get<{ episodes: import('../types').TMDBEpisode[] }>(`/tv/${showId}/season/${seasonNumber}`),

  trendingMovies: () =>
    get<{ results: import('../types').TMDBMovie[] }>('/trending/movie/week'),

  trendingShows: () =>
    get<{ results: import('../types').TMDBShow[] }>('/trending/tv/week'),

  popularMovies: () =>
    get<{ results: import('../types').TMDBMovie[] }>('/movie/popular'),

  popularShows: () =>
    get<{ results: import('../types').TMDBShow[] }>('/tv/popular'),
};
