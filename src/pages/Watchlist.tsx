import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { tmdb } from '../lib/tmdb';
import { MediaCard } from '../components/MediaCard';
import type { TMDBMovie, TMDBShow } from '../types';

export function Watchlist() {
  const watchlist = useStore((s) => s.watchlist);
  const [items, setItems] = useState<Array<{ id: number; type: 'movie' | 'tv'; data: TMDBMovie | TMDBShow }>>([]);

  useEffect(() => {
    const fetch = async () => {
      const results = await Promise.all(
        watchlist.map(async (w) => {
          try {
            const data = w.mediaType === 'movie' ? await tmdb.movie(w.mediaId) : await tmdb.show(w.mediaId);
            return { id: w.mediaId, type: w.mediaType, data };
          } catch { return null; }
        })
      );
      setItems(results.filter(Boolean) as typeof items);
    };
    fetch();
  }, [watchlist]);

  if (!watchlist.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-400 text-lg">Your watchlist is empty.</p>
        <p className="text-gray-500 text-sm mt-1">Add movies & shows with the bookmark icon.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-4">Watchlist</h1>
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
    </div>
  );
}
