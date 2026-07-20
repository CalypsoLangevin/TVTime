import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Eye, Bookmark, BookmarkCheck, Star, Clock, Check, X } from 'lucide-react';
import { tmdb, posterUrl } from '../lib/tmdb';
import { useStore } from '../store';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const movieId = Number(id);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof tmdb.movie>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickingDate, setPickingDate] = useState(false);
  const [watchDate, setWatchDate] = useState(todayStr());

  const { movies, logMovie, removeMovieWatch, isInWatchlist, addToWatchlist, removeFromWatchlist } = useStore();
  const tracked = movies[movieId];
  const inList = isInWatchlist(movieId, 'movie');

  useEffect(() => {
    tmdb.movie(movieId).then(setDetail).finally(() => setLoading(false));
  }, [movieId]);

  if (loading) return <div className="text-gray-400 p-8">Loading…</div>;
  if (!detail) return <div className="text-gray-400 p-8">Not found</div>;

  const img = posterUrl(detail.poster_path, 'w500');

  const confirmWatch = () => {
    logMovie(
      { id: detail.id, title: detail.title, poster_path: detail.poster_path, release_date: detail.release_date, runtime: detail.runtime, watchCount: 0, lastWatched: '' },
      new Date(watchDate).toISOString()
    );
    setPickingDate(false);
    setWatchDate(todayStr());
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
        <div className="w-32 sm:w-48 shrink-0 mx-auto sm:mx-0">
          {img ? (
            <img src={img} alt={detail.title} className="rounded-xl w-full shadow-lg" />
          ) : (
            <div className="aspect-[2/3] bg-gray-800 rounded-xl" />
          )}
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white text-center sm:text-left">{detail.title}</h1>
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-2 text-gray-400 text-sm">
              <span>{detail.release_date?.slice(0, 4)}</span>
              {detail.runtime && (
                <span className="flex items-center gap-1">
                  <Clock size={13} /> {detail.runtime} min
                </span>
              )}
              <span className="flex items-center gap-1 text-yellow-400">
                <Star size={13} fill="currentColor" /> {detail.vote_average.toFixed(1)}
              </span>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap justify-center sm:justify-start">
              {detail.genres.map((g) => (
                <span key={g.id} className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded-full">{g.name}</span>
              ))}
            </div>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed max-w-2xl">{detail.overview}</p>

          <div className="flex items-center gap-3 flex-wrap">
            {tracked && tracked.watchCount > 0 ? (
              <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-1 py-1">
                <button
                  onClick={() => removeMovieWatch(movieId)}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-700 hover:bg-gray-600 text-white text-lg font-bold transition"
                  title="Remove one watch"
                >
                  −
                </button>
                <span className="text-white font-semibold px-2 min-w-[2rem] text-center">{tracked.watchCount}×</span>
                <button
                  onClick={() => setPickingDate(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-purple-600 hover:bg-purple-700 text-white text-lg font-bold transition"
                  title="Add one watch"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPickingDate(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                <Eye size={15} /> Mark as Watched
              </button>
            )}
            <button
              onClick={() => inList ? removeFromWatchlist(movieId, 'movie') : addToWatchlist(movieId, 'movie')}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition"
            >
              {inList ? <><BookmarkCheck size={15} className="text-purple-400" /> In Watchlist</> : <><Bookmark size={15} /> Add to Watchlist</>}
            </button>
          </div>

          {pickingDate && (
            <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 w-fit">
              <span className="text-gray-400 text-sm">Watched on</span>
              <input
                type="date"
                value={watchDate}
                max={todayStr()}
                onChange={(e) => setWatchDate(e.target.value)}
                className="bg-gray-700 text-white text-sm px-3 py-1.5 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
              />
              <button onClick={confirmWatch} className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition" title="Confirm">
                <Check size={14} />
              </button>
              <button onClick={() => setPickingDate(false)} className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition" title="Cancel">
                <X size={14} />
              </button>
            </div>
          )}

          {tracked && tracked.watchCount > 0 && (
            <div className="bg-gray-800 rounded-xl p-4 inline-block">
              <p className="text-gray-400 text-sm">
                Watched <span className="text-purple-400 font-semibold text-lg">{tracked.watchCount}×</span>
                {' '}· Last watched {new Date(tracked.lastWatched).toLocaleDateString()}
                {detail.runtime && (
                  <span className="ml-2 text-gray-500">({Math.round(tracked.watchCount * detail.runtime / 60)}h total)</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
