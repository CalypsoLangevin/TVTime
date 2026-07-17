import { Link } from 'react-router-dom';
import { Eye, Bookmark, BookmarkCheck, Star } from 'lucide-react';
import { posterUrl } from '../lib/tmdb';
import { useStore } from '../store';
import type { MediaType } from '../types';

interface Props {
  id: number;
  type: MediaType;
  title: string;
  poster_path: string | null;
  year: string;
  rating?: number;
  watchCount?: number;
  episodeCount?: number;
}

export function MediaCard({ id, type, title, poster_path, year, rating, watchCount, episodeCount }: Props) {
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useStore();
  const inList = isInWatchlist(id, type);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    inList ? removeFromWatchlist(id, type) : addToWatchlist(id, type);
  };

  const img = posterUrl(poster_path);

  return (
    <Link to={`/${type}/${id}`} className="group relative block rounded-xl overflow-hidden bg-gray-800 shadow hover:shadow-lg hover:scale-[1.02] transition-transform">
      <div className="aspect-[2/3] bg-gray-700">
        {img ? (
          <img src={img} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs px-2 text-center">{title}</div>
        )}
      </div>

      <button
        onClick={toggle}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
      >
        {inList ? <BookmarkCheck size={14} className="text-purple-400" /> : <Bookmark size={14} />}
      </button>

      {(watchCount !== undefined && watchCount > 0) && (
        <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-black/60 text-white rounded-full px-2 py-0.5 text-xs">
          <Eye size={11} /> {watchCount}
        </div>
      )}
      {(episodeCount !== undefined && episodeCount > 0) && (
        <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-black/60 text-white rounded-full px-2 py-0.5 text-xs">
          <Eye size={11} /> {episodeCount} ep
        </div>
      )}

      <div className="p-2">
        <p className="text-white text-xs font-medium truncate">{title}</p>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-gray-400 text-xs">{year?.slice(0, 4)}</span>
          {rating !== undefined && (
            <span className="flex items-center gap-0.5 text-yellow-400 text-xs">
              <Star size={10} fill="currentColor" /> {rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
