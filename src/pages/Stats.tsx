import { useStore } from '../store';
import { Film, Tv, Clock, Eye, TrendingUp } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-zinc-800/60 border border-white/5 rounded-xl p-4 flex items-start gap-3">
      <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-zinc-500 text-xs uppercase tracking-wide">{label}</p>
        <p className="text-white text-xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-zinc-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function Stats() {
  const { movies, shows } = useStore();

  const movieList = Object.values(movies);
  const showList = Object.values(shows);

  const totalMovieWatches = movieList.reduce((a, m) => a + m.watchCount, 0);
  const totalMovieMinutes = movieList.reduce((a, m) => a + (m.runtime ?? 90) * m.watchCount, 0);
  const totalEpisodes = showList.reduce((a, s) => a + s.watchedEpisodes.length, 0);
  const totalShowMinutes = totalEpisodes * 40;
  const totalMinutes = totalMovieMinutes + totalShowMinutes;
  const totalHours = Math.round(totalMinutes / 60);
  const totalDays = (totalMinutes / 60 / 24).toFixed(1);

  const mostWatched = [...movieList].sort((a, b) => b.watchCount - a.watchCount).slice(0, 5);
  const mostEpisodes = [...showList].sort((a, b) => b.watchedEpisodes.length - a.watchedEpisodes.length).slice(0, 5);

  const moviesByYear: Record<string, number> = {};
  movieList.forEach((m) => {
    const y = m.release_date?.slice(0, 4) ?? 'Unknown';
    moviesByYear[y] = (moviesByYear[y] ?? 0) + m.watchCount;
  });

  if (totalMovieWatches === 0 && totalEpisodes === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400">No data yet — start tracking movies and episodes!</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-2xl font-bold text-white tracking-tight">My Stats</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={Film} label="Movies" value={totalMovieWatches} sub={`${movieList.length} unique`} />
        <StatCard icon={Tv} label="Episodes" value={totalEpisodes} sub={`${showList.length} shows`} />
        <StatCard icon={Clock} label="Hours" value={totalHours} sub={`${totalDays} days`} />
        <StatCard icon={Eye} label="Total watches" value={totalMovieWatches + totalEpisodes} />
        <StatCard icon={TrendingUp} label="Watching" value={showList.filter((s) => s.status === 'watching').length} sub="active shows" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {mostWatched.length > 0 && (
          <div className="bg-zinc-800/60 border border-white/5 rounded-xl p-5">
            <h2 className="text-zinc-300 text-xs font-semibold uppercase tracking-widest mb-4">Most Watched Movies</h2>
            <div className="space-y-3">
              {mostWatched.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-zinc-600 text-sm w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{m.title}</p>
                    <p className="text-zinc-500 text-xs">{m.release_date?.slice(0, 4)}</p>
                  </div>
                  <span className="text-amber-400 font-semibold text-sm shrink-0">{m.watchCount}×</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {mostEpisodes.length > 0 && (
          <div className="bg-zinc-800/60 border border-white/5 rounded-xl p-5">
            <h2 className="text-zinc-300 text-xs font-semibold uppercase tracking-widest mb-4">Most Followed Shows</h2>
            <div className="space-y-3">
              {mostEpisodes.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="text-zinc-600 text-sm w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{s.name}</p>
                    <p className="text-zinc-500 text-xs capitalize">{s.status}</p>
                  </div>
                  <span className="text-amber-400 font-semibold text-sm shrink-0">{s.watchedEpisodes.length} ep</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {Object.keys(moviesByYear).length > 0 && (
        <div className="bg-zinc-800/60 border border-white/5 rounded-xl p-5">
          <h2 className="text-zinc-300 text-xs font-semibold uppercase tracking-widest mb-4">Movies by Release Year</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(moviesByYear)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([year, count]) => (
                <div key={year} className="bg-zinc-700/50 border border-white/5 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
                  <span className="text-zinc-300">{year}</span>
                  <span className="text-amber-400 font-semibold">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
