export type MediaType = 'movie' | 'tv';

export interface TMDBMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
  vote_average: number;
  genre_ids: number[];
}

export interface TMDBShow {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  overview: string;
  vote_average: number;
  genre_ids: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
}

export interface TMDBSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date: string;
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  air_date: string;
  still_path: string | null;
  runtime: number | null;
}

export interface TMDBShowDetails extends TMDBShow {
  seasons: TMDBSeason[];
  episode_run_time: number[];
  status?: string;
  next_episode_to_air?: { season_number: number; episode_number: number; air_date: string } | null;
}

export interface WatchEntry {
  id: string;
  mediaId: number;
  mediaType: MediaType;
  watchedAt: string;
}

export interface EpisodeEntry {
  seasonNumber: number;
  episodeNumber: number;
  watchedAt: string;
}

export interface WatchlistEntry {
  mediaId: number;
  mediaType: MediaType;
  addedAt: string;
}

export interface TrackedMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  runtime: number | null;
  watchCount: number;
  lastWatched: string;
  watchDates?: string[];
}

export interface TrackedShow {
  id: number;
  name: string;
  poster_path: string | null;
  first_air_date: string;
  episode_run_time: number[];
  watchedEpisodes: EpisodeEntry[];
  status: 'watching' | 'completed' | 'paused' | 'dropped';
}
