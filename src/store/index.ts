import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrackedMovie, TrackedShow, WatchlistEntry, EpisodeEntry, MediaType } from '../types';

interface State {
  movies: Record<number, TrackedMovie>;
  shows: Record<number, TrackedShow>;
  watchlist: WatchlistEntry[];
  favorites: WatchlistEntry[];

  logMovie: (movie: TrackedMovie, watchedAt?: string) => void;
  removeMovieWatch: (id: number) => void;
  resetMovieWatches: (id: number) => void;

  addShow: (show: TrackedShow) => void;
  setShowStatus: (id: number, status: TrackedShow['status']) => void;
  logEpisode: (showId: number, entry: Omit<EpisodeEntry, 'watchedAt'>, watchedAt?: string) => void;
  unlogEpisode: (showId: number, season: number, episode: number) => void;

  addToWatchlist: (id: number, type: MediaType) => void;
  removeFromWatchlist: (id: number, type: MediaType) => void;
  isInWatchlist: (id: number, type: MediaType) => boolean;

  addToFavorites: (id: number, type: MediaType) => void;
  removeFromFavorites: (id: number, type: MediaType) => void;
  isInFavorites: (id: number, type: MediaType) => boolean;

  hasWatchedEpisode: (showId: number, season: number, episode: number) => boolean;
  episodeWatchCount: (showId: number, season: number, episode: number) => number;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      movies: {},
      shows: {},
      watchlist: [],
      favorites: [],

      logMovie: (movie, watchedAt?: string) =>
        set((s) => {
          const existing = s.movies[movie.id];
          const date = watchedAt ?? new Date().toISOString();
          const prevDates = existing?.watchDates ?? (existing?.lastWatched ? [existing.lastWatched] : []);
          return {
            movies: {
              ...s.movies,
              [movie.id]: {
                ...movie,
                watchCount: (existing?.watchCount ?? 0) + 1,
                lastWatched: date,
                watchDates: [...prevDates, date],
              },
            },
            watchlist: s.watchlist.filter((w) => !(w.mediaId === movie.id && w.mediaType === 'movie')),
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
          const newDates = m.watchDates ? m.watchDates.slice(0, -1) : [];
          return {
            movies: {
              ...s.movies,
              [id]: {
                ...m,
                watchCount: m.watchCount - 1,
                watchDates: newDates,
                lastWatched: newDates.length > 0 ? newDates[newDates.length - 1] : m.lastWatched,
              },
            },
          };
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

      logEpisode: (showId, entry, watchedAt?) =>
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
                  { ...entry, watchedAt: watchedAt ?? new Date().toISOString() },
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

      addToFavorites: (id, type) =>
        set((s) => {
          if (s.favorites.some((f) => f.mediaId === id && f.mediaType === type)) return s;
          return { favorites: [...s.favorites, { mediaId: id, mediaType: type, addedAt: new Date().toISOString() }] };
        }),

      removeFromFavorites: (id, type) =>
        set((s) => ({
          favorites: s.favorites.filter((f) => !(f.mediaId === id && f.mediaType === type)),
        })),

      isInFavorites: (id, type) =>
        get().favorites.some((f) => f.mediaId === id && f.mediaType === type),

      hasWatchedEpisode: (showId, season, episode) =>
        !!get().shows[showId]?.watchedEpisodes.some(
          (e) => e.seasonNumber === season && e.episodeNumber === episode
        ),

      episodeWatchCount: (showId, season, episode) =>
        get().shows[showId]?.watchedEpisodes.filter(
          (e) => e.seasonNumber === season && e.episodeNumber === episode
        ).length ?? 0,
    }),
    { name: 'queued-store' }
  )
);
