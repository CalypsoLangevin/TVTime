import { useEffect, useState } from 'react';
import { tmdb } from '../lib/tmdb';
import { MediaCard } from '../components/MediaCard';
import { SearchBar } from '../components/SearchBar';
import type { TMDBMovie, TMDBShow } from '../types';

export function Discover() {
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [shows, setShows] = useState<TMDBShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([tmdb.trendingMovies(), tmdb.trendingShows()])
      .then(([m, s]) => { setMovies(m.results.slice(0, 12)); setShows(s.results.slice(0, 12)); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-white tracking-tight">Discover</h1>
        <SearchBar />
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3">
          TMDB error: {error}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <Section title="Trending Movies">
            {movies.map((m) => (
              <MediaCard key={m.id} id={m.id} type="movie" title={m.title} poster_path={m.poster_path} year={m.release_date} rating={m.vote_average} />
            ))}
          </Section>
          <Section title="Trending Shows">
            {shows.map((s) => (
              <MediaCard key={s.id} id={s.id} type="tv" title={s.name} poster_path={s.poster_path} year={s.first_air_date} rating={s.vote_average} />
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-zinc-300 uppercase tracking-widest mb-3">{title}</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">{children}</div>
    </section>
  );
}
