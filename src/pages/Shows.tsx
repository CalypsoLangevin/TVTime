import { useStore } from '../store';
import { MediaCard } from '../components/MediaCard';

const STATUS_ORDER = ['watching', 'completed', 'paused', 'dropped'] as const;

export function Shows() {
  const shows = useStore((s) => s.shows);
  const list = Object.values(shows);

  if (!list.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-400 text-lg">No shows tracked yet.</p>
        <p className="text-gray-500 text-sm mt-1">Search for a show and start tracking episodes.</p>
      </div>
    );
  }

  const grouped = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = list.filter((s) => s.status === status);
    return acc;
  }, {} as Record<string, typeof list>);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-2xl font-bold text-white">My Shows</h1>
      {STATUS_ORDER.map((status) => {
        const items = grouped[status];
        if (!items.length) return null;
        return (
          <section key={status}>
            <h2 className="text-base font-semibold text-gray-300 capitalize mb-3">{status}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {items.map((s) => (
                <MediaCard
                  key={s.id}
                  id={s.id}
                  type="tv"
                  title={s.name}
                  poster_path={s.poster_path}
                  year={s.first_air_date}
                  episodeCount={s.watchedEpisodes.length}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
