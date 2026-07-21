import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, ChevronRight, Clock } from 'lucide-react';
import { useStore } from '../store';
import { MediaCard } from '../components/MediaCard';
import { tmdb, posterUrl } from '../lib/tmdb';
import type { TrackedShow } from '../types';

// ─── Next-episode cache ───────────────────────────────────────────────────────
interface NextEp {
  season: number;
  episode: number;
  name: string;
  airDate: string | null; // null = already aired / unknown
}
type UpcomingMap = Record<number, NextEp | null>; // showId → info (null = nothing upcoming)

function useUpcoming(shows: TrackedShow[]) {
  const [map, setMap] = useState<UpcomingMap>({});

  useEffect(() => {
    if (!shows.length) return;
    let cancelled = false;
    (async () => {
      const results: UpcomingMap = {};
      await Promise.all(
        shows.map(async (show) => {
          try {
            const data = await tmdb.upcomingEpisode(show.id);
            const next = data.next_episode_to_air;
            results[show.id] = next
              ? { season: next.season_number, episode: next.episode_number, name: next.name, airDate: next.air_date }
              : null;
          } catch {
            results[show.id] = null;
          }
        })
      );
      if (!cancelled) setMap(results);
    })();
    return () => { cancelled = true; };
  }, [shows.map((s) => s.id).join(',')]);

  return map;
}

// ─── Next unwatched episode ───────────────────────────────────────────────────
function nextToWatch(show: TrackedShow): { season: number; episode: number } | null {
  const watched = new Set(show.watchedEpisodes.map((e) => `${e.seasonNumber}x${e.episodeNumber}`));
  // Walk from S01E01 upward — we don't know total eps per season here,
  // so find the highest watched ep and return the next one
  if (!watched.size) return { season: 1, episode: 1 };
  const sorted = [...show.watchedEpisodes].sort((a, b) =>
    a.seasonNumber !== b.seasonNumber ? a.seasonNumber - b.seasonNumber : a.episodeNumber - b.episodeNumber
  );
  const last = sorted[sorted.length - 1];
  // Try next episode in same season, then S+1 E1
  const nextEp = { season: last.seasonNumber, episode: last.episodeNumber + 1 };
  return watched.has(`${nextEp.season}x${nextEp.episode}`) ? null : nextEp;
}

// ─── Row component ─────────────────────────────────────────────────────────────
function ShowRow({ show, nextEp, upcoming }: { show: TrackedShow; nextEp: { season: number; episode: number } | null; upcoming: NextEp | null | undefined }) {
  const poster = posterUrl(show.poster_path, 'w185');
  const lastWatched = show.watchedEpisodes.length > 0
    ? [...show.watchedEpisodes].sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime())[0]
    : null;

  return (
    <Link to={`/tv/${show.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition rounded-xl">
      <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 bg-zinc-800">
        {poster ? <img src={poster} alt={show.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-700" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{show.name}</p>
        {nextEp && (
          <p className="text-brand text-xs mt-0.5">
            Next: S{String(nextEp.season).padStart(2, '0')} · E{String(nextEp.episode).padStart(2, '0')}
          </p>
        )}
        {lastWatched && (
          <p className="text-zinc-500 text-xs mt-0.5">
            Last watched {new Date(lastWatched.watchedAt).toLocaleDateString()}
          </p>
        )}
      </div>
      {upcoming && (
        <div className="text-right shrink-0">
          <p className="text-xs text-zinc-400">S{String(upcoming.season).padStart(2, '0')}E{String(upcoming.episode).padStart(2, '0')}</p>
          <p className="text-xs text-brand mt-0.5">{upcoming.airDate ? new Date(upcoming.airDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Soon'}</p>
        </div>
      )}
      <ChevronRight size={14} className="text-zinc-600 shrink-0" />
    </Link>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
type Tab = 'towatch' | 'upcoming';

export function Shows() {
  const shows = useStore((s) => s.shows);
  const list = Object.values(shows);
  const [tab, setTab] = useState<Tab>('towatch');
  const [query, setQuery] = useState('');

  const watching = useMemo(() => list.filter((s) => s.status === 'watching'), [list]);
  const upcomingMap = useUpcoming(watching);

  const filtered = useMemo(() => {
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((s) => s.name.toLowerCase().includes(q));
  }, [list, query]);

  // Sorted by most recently watched episode
  const toWatchList = useMemo(() =>
    [...watching].sort((a, b) => {
      const latestA = a.watchedEpisodes.length ? Math.max(...a.watchedEpisodes.map((e) => new Date(e.watchedAt).getTime())) : 0;
      const latestB = b.watchedEpisodes.length ? Math.max(...b.watchedEpisodes.map((e) => new Date(e.watchedAt).getTime())) : 0;
      return latestB - latestA;
    }),
    [watching]
  );

  const upcomingList = useMemo(() =>
    watching
      .filter((s) => upcomingMap[s.id] != null)
      .sort((a, b) => {
        const da = upcomingMap[a.id]?.airDate ?? '9999';
        const db = upcomingMap[b.id]?.airDate ?? '9999';
        return da < db ? -1 : 1;
      }),
    [watching, upcomingMap]
  );

  if (!list.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-2">
        <p className="text-zinc-300 text-lg font-medium">No shows tracked yet</p>
        <p className="text-zinc-500 text-sm">Search for a show and start tracking episodes.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your shows…"
          className="w-full bg-zinc-800 border border-white/5 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand/40"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search results */}
      {query ? (
        <div className="bg-zinc-800/60 border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
          {filtered.length === 0
            ? <p className="text-zinc-500 text-sm px-4 py-6 text-center">No shows found</p>
            : filtered.map((s) => (
              <ShowRow key={s.id} show={s} nextEp={nextToWatch(s)} upcoming={upcomingMap[s.id]} />
            ))
          }
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex border-b border-white/5">
            {(['towatch', 'upcoming'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                  tab === t ? 'border-brand text-brand' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                {t === 'towatch' ? 'To Watch' : 'Upcoming'}
              </button>
            ))}
          </div>

          {/* To Watch tab */}
          {tab === 'towatch' && (
            <div className="space-y-6">
              {/* Next episodes */}
              {toWatchList.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2 px-1">Continue watching</h2>
                  <div className="bg-zinc-800/60 border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
                    {toWatchList.map((s) => (
                      <ShowRow key={s.id} show={s} nextEp={nextToWatch(s)} upcoming={undefined} />
                    ))}
                  </div>
                </section>
              )}

              {/* Recently watched episodes (chronological) */}
              <section>
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2 px-1">Recently watched</h2>
                <div className="bg-zinc-800/60 border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
                  {list
                    .flatMap((s) => s.watchedEpisodes.map((e) => ({ show: s, ep: e })))
                    .sort((a, b) => new Date(b.ep.watchedAt).getTime() - new Date(a.ep.watchedAt).getTime())
                    .slice(0, 15)
                    .map(({ show, ep }, i) => (
                      <Link key={i} to={`/tv/${show.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition">
                        <div className="w-8 h-11 rounded overflow-hidden shrink-0 bg-zinc-700">
                          {show.poster_path && <img src={posterUrl(show.poster_path, 'w185')!} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-zinc-300 text-xs font-medium truncate">{show.name}</p>
                          <p className="text-zinc-500 text-xs">S{String(ep.seasonNumber).padStart(2, '0')} · E{String(ep.episodeNumber).padStart(2, '0')}</p>
                        </div>
                        <p className="text-zinc-600 text-xs shrink-0">{new Date(ep.watchedAt).toLocaleDateString()}</p>
                      </Link>
                    ))
                  }
                  {list.every((s) => s.watchedEpisodes.length === 0) && (
                    <p className="text-zinc-500 text-sm px-4 py-6 text-center">No episodes watched yet</p>
                  )}
                </div>
              </section>

              {/* Other statuses */}
              {(['completed', 'paused', 'dropped'] as const).map((status) => {
                const items = list.filter((s) => s.status === status);
                if (!items.length) return null;
                const labels = { completed: 'Completed', paused: 'Paused', dropped: 'Dropped' };
                return (
                  <section key={status}>
                    <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2 px-1">{labels[status]}</h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {items.map((s) => (
                        <MediaCard key={s.id} id={s.id} type="tv" title={s.name} poster_path={s.poster_path} year={s.first_air_date} episodeCount={s.watchedEpisodes.length} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {/* Upcoming tab */}
          {tab === 'upcoming' && (
            <div className="space-y-2">
              {Object.values(upcomingMap).every((v) => v === null || v === undefined) && watching.length > 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-zinc-500">
                  <Clock size={28} className="text-zinc-700" />
                  <p className="text-sm">Loading upcoming episodes…</p>
                </div>
              ) : upcomingList.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-zinc-500">
                  <Clock size={28} className="text-zinc-700" />
                  <p className="text-sm">No upcoming episodes for your shows</p>
                </div>
              ) : (
                <div className="bg-zinc-800/60 border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
                  {upcomingList.map((s) => (
                    <ShowRow key={s.id} show={s} nextEp={null} upcoming={upcomingMap[s.id]} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
