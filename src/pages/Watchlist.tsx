import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { tmdb } from '../lib/tmdb';
import { MediaCard } from '../components/MediaCard';
import type { TMDBMovie, TMDBShow, MediaType } from '../types';

type Item = { id: number; type: MediaType; data: TMDBMovie | TMDBShow };
type Filter = 'all' | 'movie' | 'tv';

async function fetchItems(entries: { mediaId: number; mediaType: MediaType }[]): Promise<Item[]> {
  const results = await Promise.all(
    entries.map(async (w) => {
      try {
        const data = w.mediaType === 'movie' ? await tmdb.movie(w.mediaId) : await tmdb.show(w.mediaId);
        return { id: w.mediaId, type: w.mediaType, data };
      } catch { return null; }
    })
  );
  return results.filter(Boolean) as Item[];
}

function ItemGrid({ items }: { items: Item[] }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
      {items.map((item) => {
        const isMovie = item.type === 'movie';
        const d = item.data as TMDBMovie & TMDBShow;
        return (
          <MediaCard
            key={`${item.type}-${item.id}`}
            id={item.id}
            type={item.type}
            title={isMovie ? d.title : d.name}
            poster_path={d.poster_path}
            year={isMovie ? d.release_date : d.first_air_date}
            rating={d.vote_average}
          />
        );
      })}
    </div>
  );
}

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Movies', value: 'movie' },
  { label: 'Shows', value: 'tv' },
];

function applyFilter(items: Item[], filter: Filter) {
  return filter === 'all' ? items : items.filter(i => i.type === filter);
}

export function Watchlist() {
  const { watchlist, favorites } = useStore();
  const [watchlistItems, setWatchlistItems] = useState<Item[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    fetchItems(watchlist.map(w => ({ mediaId: w.mediaId, mediaType: w.mediaType }))).then(setWatchlistItems);
  }, [watchlist]);

  useEffect(() => {
    fetchItems(favorites.map(f => ({ mediaId: f.mediaId, mediaType: f.mediaType }))).then(setFavoriteItems);
  }, [favorites]);

  const hasAnything = watchlist.length > 0 || favorites.length > 0;

  if (!hasAnything) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-2">
        <p className="text-zinc-300 text-lg font-medium">Nothing saved yet</p>
        <p className="text-zinc-500 text-sm">Use the bookmark icon to add to your watchlist, or the heart to mark a favorite.</p>
      </div>
    );
  }

  const filteredFavorites = applyFilter(favoriteItems, filter);
  const filteredWatchlist = applyFilter(watchlistItems, filter);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-tight">My Lists</h1>
        <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-zinc-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filteredFavorites.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
            <span className="text-red-400">♥</span> Favorites
          </h2>
          <ItemGrid items={filteredFavorites} />
        </section>
      )}

      {filteredWatchlist.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-300 uppercase tracking-widest">Watchlist</h2>
          <ItemGrid items={filteredWatchlist} />
        </section>
      )}

      {filteredFavorites.length === 0 && filteredWatchlist.length === 0 && (
        <p className="text-zinc-500 text-sm text-center py-8">No {filter === 'movie' ? 'movies' : 'shows'} saved yet.</p>
      )}
    </div>
  );
}
