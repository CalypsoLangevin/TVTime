import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrackedMovie, TrackedShow, WatchlistEntry, EpisodeEntry, MediaType } from '../types';

interface State {
  movies: Record<number, TrackedMovie>;
  shows: Record<number, TrackedShow>;
  watchlist: WatchlistEntry[];

  logMovie: (movie: TrackedMovie) => void;
  removeMovieWatch: (id: number) => void;
  resetMovieWatches: (id: number) => void;

  addShow: (show: TrackedShow) => void;
  setShowStatus: (id: number, status: TrackedShow['status']) => void;
  logEpisode: (showId: number, entry: Omit<EpisodeEntry, 'watchedAt'>) => void;
  unlogEpisode: (showId: number, season: number, episode: number) => void;

  addToWatchlist: (id: number, type: MediaType) => void;
  removeFromWatchlist: (id: number, type: MediaType) => void;
  isInWatchlist: (id: number, type: MediaType) => boolean;

  hasWatchedEpisode: (showId: number, season: number, episode: number) => boolean;
  episodeWatchCount: (showId: number, season: number, episode: number) => number;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      movies: {},
      shows: {},
      watchlist: [],

      logMovie: (movie) =>
        set((s) => {
          const existing = s.movies[movie.id];
          return {
            movies: {
              ...s.movies,
              [movie.id]: {
                ...movie,
                watchCount: (existing?.watchCount ?? 0) + 1,
                lastWatched: new Date().toISOString(),
              },
            },
          };
        }),

      removeMovieWatch: (id) =>
        set((s) => {
          const m = s.movies[id];
          if (!m) return s;
          if (m.watchCount <= 1) {
            const next = { ...s.movies };
            delete next[id];
            return { movies: next };
          }
          return { movies: { ...s.movies, [id]: { ...m, watchCount: m.watchCount - 1 } } };
        }),

      resetMovieWatches: (id) =>
        set((s) => {
          const next = { ...s.movies };
          delete next[id];
          return { movies: next };
        }),

      addShow: (show) =>
        set((s) => ({
          shows: { ...s.shows, [show.id]: s.shows[show.id] ?? show },
        })),

      setShowStatus: (id, status) =>
        set((s) => ({
          shows: { ...s.shows, [id]: { ...s.shows[id], status } },
        })),

      logEpisode: (showId, entry) =>
        set((s) => {
          const show = s.shows[showId];
          if (!show) return s;
          const already = get().hasWatchedEpisode(showId, entry.seasonNumber, entry.episodeNumber);
          if (already) return s;
          return {
            shows: {
              ...s.shows,
              [showId]: {
                ...show,
                watchedEpisodes: [
                  ...show.watchedEpisodes,
                  { ...entry, watchedAt: new Date().toISOString() },
                ],
              },
            },
          };
        }),

      unlogEpisode: (showId, season, episode) =>
        set((s) => {
          const show = s.shows[showId];
          if (!show) return s;
          return {
            shows: {
              ...s.shows,
              [showId]: {
                ...show,
                watchedEpisodes: show.watchedEpisodes.filter(
                  (e) => !(e.seasonNumber === season && e.episodeNumber === episode)
                ),
              },
            },
          };
        }),

      addToWatchlist: (id, type) =>
        set((s) => {
          if (s.watchlist.some((w) => w.mediaId === id && w.mediaType === type)) return s;
          return { watchlist: [...s.watchlist, { mediaId: id, mediaType: type, addedAt: new Date().toISOString() }] };
        }),

      removeFromWatchlist: (id, type) =>
        set((s) => ({
          watchlist: s.watchlist.filter((w) => !(w.mediaId === id && w.mediaType === type)),
        })),

      isInWatchlist: (id, type) =>
        get().watchlist.some((w) => w.mediaId === id && w.mediaType === type),

      hasWatchedEpisode: (showId, season, episode) =>
        !!get().shows[showId]?.watchedEpisodes.some(
          (e) => e.seasonNumber === season && e.episodeNumber === episode
        ),

      episodeWatchCount: (showId, season, episode) =>
        get().shows[showId]?.watchedEpisodes.filter(
          (e) => e.seasonNumber === season && e.episodeNumber === episode
        ).length ?? 0,
    }),
    { name: 'tvtime-store' }
  )
);
