import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useStore } from '../store';
import { MediaCard } from '../components/MediaCard';
import { posterUrl } from '../lib/tmdb';

export function Movies() {
  const movies = useStore((s) => s.movies);
  const list = Object.values(movies);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return list.filter((m) => m.title.toLowerCase().includes(q));
  }, [list, query]);

  // Recent watches — each watchDate entry is its own row
  const recentWatches = useMemo(() =>
    list
      .flatMap((m) =>
        (m.watchDates ?? (m.lastWatched ? [m.lastWatched] : [])).map((d) => ({ movie: m, date: d }))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15),
    [list]
  );

  const sorted = useMemo(() =>
    [...list].sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime()),
    [list]
  );

  if (!list.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-2">
        <p className="text-zinc-300 text-lg font-medium">No movies tracked yet</p>
        <p className="text-zinc-500 text-sm">Search for a movie and mark it as watched.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Search bar */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your movies…"
          className="w-full bg-zinc-800 border border-white/5 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand/40"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search results */}
      {filtered ? (
        <div className="bg-zinc-800/60 border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
          {filtered.length === 0
            ? <p className="text-zinc-500 text-sm px-4 py-6 text-center">No movies found</p>
            : filtered.map((m) => (
              <Link key={m.id} to={`/movie/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition">
                <div className="w-8 h-12 rounded overflow-hidden shrink-0 bg-zinc-700">
                  {m.poster_path && <img src={posterUrl(m.poster_path, 'w185')!} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{m.title}</p>
                  <p className="text-zinc-500 text-xs">{m.release_date?.slice(0, 4)}</p>
                </div>
                <span className="text-brand text-xs font-medium shrink-0">{m.watchCount}×</span>
              </Link>
            ))
          }
        </div>
      ) : (
        <>
          {/* Recently watched */}
          <section>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2 px-1">Recently watched</h2>
            <div className="bg-zinc-800/60 border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
              {recentWatches.map(({ movie, date }, i) => (
                <Link key={i} to={`/movie/${movie.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition">
                  <div className="w-8 h-12 rounded overflow-hidden shrink-0 bg-zinc-700">
                    {movie.poster_path && <img src={posterUrl(movie.poster_path, 'w185')!} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-200 text-sm font-medium truncate">{movie.title}</p>
                    <p className="text-zinc-500 text-xs">{movie.release_date?.slice(0, 4)}</p>
                  </div>
                  <p className="text-zinc-500 text-xs shrink-0">{new Date(date).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* All movies grid */}
          <section>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2 px-1">All movies</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {sorted.map((m) => (
                <MediaCard key={m.id} id={m.id} type="movie" title={m.title} poster_path={m.poster_path} year={m.release_date} watchCount={m.watchCount} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
