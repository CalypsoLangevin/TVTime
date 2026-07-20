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
    <Link
      to={`/${type}/${id}`}
      className="group relative block rounded-xl overflow-hidden bg-zinc-800 shadow-lg hover:scale-[1.03] hover:shadow-brand/10 hover:shadow-xl transition-all duration-200"
    >
      <div className="aspect-[2/3] bg-zinc-700">
        {img ? (
          <img src={img} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs px-2 text-center">{title}</div>
        )}
        {/* gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
      </div>

      {/* Bottom info on top of gradient */}
      <div className="absolute bottom-0 inset-x-0 p-2">
        <p className="text-white text-xs font-medium leading-tight line-clamp-2">{title}</p>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-zinc-400 text-[10px]">{year?.slice(0, 4)}</span>
          {rating !== undefined && (
            <span className="flex items-center gap-0.5 text-brand text-[10px]">
              <Star size={9} fill="currentColor" /> {rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Watchlist button */}
      <button
        onClick={toggle}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition"
      >
        {inList
          ? <BookmarkCheck size={13} className="text-brand" />
          : <Bookmark size={13} />}
      </button>

      {/* Watch count badge */}
      {watchCount !== undefined && watchCount > 0 && (
        <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm text-brand rounded-full px-2 py-0.5 text-[10px] font-medium">
          <Eye size={10} /> {watchCount}×
        </div>
      )}
      {episodeCount !== undefined && episodeCount > 0 && (
        <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm text-brand rounded-full px-2 py-0.5 text-[10px] font-medium">
          <Eye size={10} /> {episodeCount} ep
        </div>
      )}
    </Link>
  );
}
