import { useStore } from '../store';
import { MediaCard } from '../components/MediaCard';

export function Movies() {
  const movies = useStore((s) => s.movies);
  const list = Object.values(movies).sort((a, b) => b.watchCount - a.watchCount);

  if (!list.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-2">
        <p className="text-zinc-300 text-lg font-medium">No movies tracked yet</p>
        <p className="text-zinc-500 text-sm">Search for a movie and mark it as watched.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white tracking-tight mb-4">My Movies</h1>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {list.map((m) => (
          <MediaCard key={m.id} id={m.id} type="movie" title={m.title} poster_path={m.poster_path} year={m.release_date} watchCount={m.watchCount} />
        ))}
      </div>
    </div>
  );
}
