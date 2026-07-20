import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { tmdb, posterUrl } from '../lib/tmdb';
import { Link } from 'react-router-dom';
import type { MediaType } from '../types';

function minutesToTime(minutes: number) {
  const totalHours = Math.floor(minutes / 60);
  const totalDays = Math.floor(totalHours / 24);
  const months = Math.floor(totalDays / 30);
  const days = totalDays % 30;
  const hours = totalHours % 24;
  return { months, days, hours };
}

function TimeDisplay({ minutes }: { minutes: number }) {
  const { months, days, hours } = minutesToTime(minutes);
  return (
    <div className="flex items-end gap-4">
      <div className="text-center">
        <div className="text-white text-3xl font-bold leading-none">{months}</div>
        <div className="text-zinc-500 text-[10px] uppercase tracking-widest mt-1">Months</div>
      </div>
      <div className="text-center">
        <div className="text-white text-3xl font-bold leading-none">{days}</div>
        <div className="text-zinc-500 text-[10px] uppercase tracking-widest mt-1">Days</div>
      </div>
      <div className="text-center">
        <div className="text-white text-3xl font-bold leading-none">{hours}</div>
        <div className="text-zinc-500 text-[10px] uppercase tracking-widest mt-1">Hours</div>
      </div>
    </div>
  );
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length || data.every(d => d.value === 0)) {
    return <div className="h-32 flex items-center justify-center text-zinc-600 text-sm">No data yet</div>;
  }
  const max = Math.max(...data.map(d => d.value));
  const barH = 80;

  return (
    <div className="overflow-x-auto">
      <svg
        width={Math.max(data.length * 36, 300)}
        height={barH + 40}
        className="overflow-visible"
      >
        {data.map((d, i) => {
          const h = max > 0 ? Math.max(2, (d.value / max) * barH) : 2;
          const x = i * 36 + 4;
          const y = barH - h;
          return (
            <g key={d.label}>
              <rect x={x} y={y} width={24} height={h} rx={2} fill="#52525b" />
              {d.value > 0 && (
                <text x={x + 12} y={y - 4} textAnchor="middle" fill="#a1a1aa" fontSize={9}>{d.value}</text>
              )}
              <text x={x + 12} y={barH + 14} textAnchor="middle" fill="#52525b" fontSize={9}>{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden">
      <div className="px-5 pt-5 pb-1">
        <h2 className="text-white text-lg font-bold">{title}</h2>
        <div className="border-t border-zinc-700 mt-3" />
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

type FavItem = { id: number; type: MediaType; title: string; poster_path: string | null; year: string };

function FavoritesRow({ items }: { items: FavItem[] }) {
  if (!items.length) return <p className="text-zinc-600 text-sm">No favorites yet</p>;
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {items.map((item) => {
        const img = posterUrl(item.poster_path, 'w185');
        return (
          <Link key={`${item.type}-${item.id}`} to={`/${item.type}/${item.id}`} className="shrink-0 w-16 group">
            <div className="w-16 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 ring-1 ring-white/5 group-hover:ring-red-400/50 transition">
              {img ? <img src={img} alt={item.title} className="w-full h-full object-cover" /> : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function Stats() {
  const [tab, setTab] = useState<'shows' | 'movies'>('shows');
  const { movies, shows, favorites } = useStore();

  const [favItems, setFavItems] = useState<FavItem[]>([]);
  useEffect(() => {
    Promise.all(
      favorites.map(async (f) => {
        try {
          if (f.mediaType === 'movie') {
            const d = await tmdb.movie(f.mediaId);
            return { id: f.mediaId, type: f.mediaType as MediaType, title: d.title, poster_path: d.poster_path, year: d.release_date };
          } else {
            const d = await tmdb.show(f.mediaId);
            return { id: f.mediaId, type: f.mediaType as MediaType, title: d.name, poster_path: d.poster_path, year: d.first_air_date };
          }
        } catch { return null; }
      })
    ).then(r => setFavItems(r.filter(Boolean) as FavItem[]));
  }, [favorites]);

  const movieList = Object.values(movies);
  const showList = Object.values(shows);

  // Time calculations
  const totalShowMinutes = showList.reduce((a, s) => {
    const avgRuntime = s.episode_run_time?.[0] ?? 40;
    return a + s.watchedEpisodes.length * avgRuntime;
  }, 0);
  const totalMovieMinutes = movieList.reduce((a, m) => a + (m.runtime ?? 90) * m.watchCount, 0);
  const totalEpisodes = showList.reduce((a, s) => a + s.watchedEpisodes.length, 0);
  const totalMovieWatches = movieList.reduce((a, m) => a + m.watchCount, 0);

  // Episodes per month (last 12 months)
  const now = new Date();
  const monthLabels = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString('default', { month: 'short' }).slice(0, 3),
    };
  });
  const epsByMonth: Record<string, number> = {};
  showList.forEach(s => {
    s.watchedEpisodes.forEach(ep => {
      const d = new Date(ep.watchedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      epsByMonth[key] = (epsByMonth[key] ?? 0) + 1;
    });
  });
  const episodeChartData = monthLabels.map(m => ({ label: m.label, value: epsByMonth[m.key] ?? 0 }));

  // Movies per month (last 12)
  const moviesByMonth: Record<string, number> = {};
  movieList.forEach(m => {
    if (!m.lastWatched) return;
    const d = new Date(m.lastWatched);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    moviesByMonth[key] = (moviesByMonth[key] ?? 0) + m.watchCount;
  });
  const movieChartData = monthLabels.map(m => ({ label: m.label, value: moviesByMonth[m.key] ?? 0 }));

  // Biggest marathons (most episodes per show)
  const marathons = [...showList]
    .sort((a, b) => b.watchedEpisodes.length - a.watchedEpisodes.length)
    .slice(0, 5)
    .filter(s => s.watchedEpisodes.length > 0);

  // Most watched movies
  const topMovies = [...movieList]
    .sort((a, b) => b.watchCount - a.watchCount)
    .slice(0, 5)
    .filter(m => m.watchCount > 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-white tracking-tight">Stats</h1>

      {/* Top 4 stat tiles */}
      <div className="grid grid-cols-2 gap-px bg-zinc-800 rounded-xl overflow-hidden border border-zinc-800">
        <div className="bg-zinc-900 p-4 space-y-3">
          <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-widest">
            <span>📺</span> TV Time
          </div>
          <TimeDisplay minutes={totalShowMinutes} />
        </div>
        <div className="bg-zinc-900 p-4 space-y-3">
          <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-widest">
            <span>📺</span> Episodes watched
          </div>
          <div className="text-white text-3xl font-bold">{totalEpisodes.toLocaleString()}</div>
        </div>
        <div className="bg-zinc-900 p-4 space-y-3 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-widest">
            <span>🎬</span> Movie Time
          </div>
          <TimeDisplay minutes={totalMovieMinutes} />
        </div>
        <div className="bg-zinc-900 p-4 space-y-3 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-widest">
            <span>🎬</span> Movies watched
          </div>
          <div className="text-white text-3xl font-bold">{totalMovieWatches.toLocaleString()}</div>
        </div>
      </div>

      {/* SHOWS / MOVIES tab switcher */}
      <div className="flex border-b border-zinc-800">
        {(['shows', 'movies'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
              tab === t
                ? 'text-white border-b-2 border-brand -mb-px'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'shows' && (
        <div className="space-y-4">
          <SectionCard title="Favorite Shows">
            <div className="mt-3">
              <FavoritesRow items={favItems.filter(f => f.type === 'tv')} />
            </div>
          </SectionCard>

          {/* Episodes watched chart */}
          <SectionCard title="Episodes watched">
            <div className="mt-4">
              <BarChart data={episodeChartData} />
              <p className="text-zinc-500 text-xs uppercase tracking-widest text-center mt-3">Per Month</p>
            </div>
          </SectionCard>

          {/* Biggest marathons */}
          {marathons.length > 0 && (
            <SectionCard title="Biggest marathons">
              <div className="mt-3 space-y-0">
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 pb-2">
                  <span className="text-zinc-500 text-xs uppercase tracking-widest">Show</span>
                  <span className="text-zinc-500 text-xs uppercase tracking-widest text-right">Episodes</span>
                  <span className="text-zinc-500 text-xs uppercase tracking-widest text-right">Hours</span>
                </div>
                {marathons.map((s) => {
                  const avgRuntime = s.episode_run_time?.[0] ?? 40;
                  const hours = Math.round(s.watchedEpisodes.length * avgRuntime / 60);
                  return (
                    <div key={s.id} className="grid grid-cols-[1fr_auto_auto] gap-4 py-3 border-t border-zinc-800">
                      <span className="text-white text-sm truncate">{s.name}</span>
                      <span className="text-white text-sm text-right">{s.watchedEpisodes.length}</span>
                      <span className="text-white text-sm text-right">{hours}</span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* Added shows */}
          <SectionCard title="Added shows">
            <div className="mt-2">
              <div className="text-white text-5xl font-bold">{showList.length}</div>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === 'movies' && (
        <div className="space-y-4">
          <SectionCard title="Favorite Movies">
            <div className="mt-3">
              <FavoritesRow items={favItems.filter(f => f.type === 'movie')} />
            </div>
          </SectionCard>

          {/* Movies watched chart */}
          <SectionCard title="Movies watched">
            <div className="mt-4">
              <BarChart data={movieChartData} />
              <p className="text-zinc-500 text-xs uppercase tracking-widest text-center mt-3">Per Month</p>
            </div>
          </SectionCard>

          {/* Most watched */}
          {topMovies.length > 0 && (
            <SectionCard title="Most watched">
              <div className="mt-3">
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 pb-2">
                  <span className="text-zinc-500 text-xs uppercase tracking-widest">Movie</span>
                  <span className="text-zinc-500 text-xs uppercase tracking-widest text-right">Times</span>
                  <span className="text-zinc-500 text-xs uppercase tracking-widest text-right">Hours</span>
                </div>
                {topMovies.map((m) => {
                  const hours = Math.round((m.runtime ?? 90) * m.watchCount / 60);
                  return (
                    <div key={m.id} className="grid grid-cols-[1fr_auto_auto] gap-4 py-3 border-t border-zinc-800">
                      <span className="text-white text-sm truncate">{m.title}</span>
                      <span className="text-white text-sm text-right">{m.watchCount}×</span>
                      <span className="text-white text-sm text-right">{hours}</span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* Added movies */}
          <SectionCard title="Added movies">
            <div className="mt-2">
              <div className="text-white text-5xl font-bold">{movieList.length}</div>
            </div>
          </SectionCard>
        </div>
      )}

      {totalEpisodes === 0 && totalMovieWatches === 0 && (
        <p className="text-center text-zinc-500 text-sm py-8">No data yet — start tracking to see your stats.</p>
      )}
    </div>
  );
}
