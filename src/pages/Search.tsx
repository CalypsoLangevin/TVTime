import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tmdb } from '../lib/tmdb';
import { MediaCard } from '../components/MediaCard';
import { SearchBar } from '../components/SearchBar';
import type { TMDBMovie, TMDBShow } from '../types';

type Result = (TMDBMovie | TMDBShow) & { media_type: 'movie' | 'tv' };

export function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') ?? '';
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError(null);
    tmdb.searchMulti(query)
      .then((data) => {
        const filtered = (data.results as unknown as Result[]).filter(
          (r) => r.media_type === 'movie' || r.media_type === 'tv'
        );
        setResults(filtered);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-3">Search</h1>
        <SearchBar />
      </div>
      {query && (
        <p className="text-gray-400 text-sm">
          {loading ? 'Searching…' : `${results.length} results for "${query}"`}
        </p>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {results.map((r) => (
          <MediaCard
            key={`${r.media_type}-${r.id}`}
            id={r.id}
            type={r.media_type}
            title={r.media_type === 'movie' ? (r as TMDBMovie).title : (r as TMDBShow).name}
            poster_path={r.poster_path}
            year={r.media_type === 'movie' ? (r as TMDBMovie).release_date : (r as TMDBShow).first_air_date}
            rating={r.vote_average}
          />
        ))}
      </div>
    </div>
  );
}
