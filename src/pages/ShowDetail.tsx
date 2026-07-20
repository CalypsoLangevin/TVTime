import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Eye, EyeOff, Bookmark, BookmarkCheck, Heart, Star, CheckCheck } from 'lucide-react';
import { tmdb, posterUrl, backdropUrl } from '../lib/tmdb';
import { useStore } from '../store';
import type { TMDBEpisode, TMDBShowDetails } from '../types';

export function ShowDetail() {
  const { id } = useParams<{ id: string }>();
  const showId = Number(id);
  const [detail, setDetail] = useState<TMDBShowDetails | null>(null);
  const [episodes, setEpisodes] = useState<Record<number, TMDBEpisode[]>>({});
  const [openSeason, setOpenSeason] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const { shows, addShow, setShowStatus, logEpisode, unlogEpisode, hasWatchedEpisode, isInWatchlist, addToWatchlist, removeFromWatchlist, isInFavorites, addToFavorites, removeFromFavorites } = useStore();
  const tracked = shows[showId];
  const inList = isInWatchlist(showId, 'tv');
  const inFavorites = isInFavorites(showId, 'tv');

  useEffect(() => {
    tmdb.show(showId).then((d) => {
      setDetail(d);
      addShow({
        id: d.id,
        name: d.name,
        poster_path: d.poster_path,
        first_air_date: d.first_air_date,
        episode_run_time: d.episode_run_time,
        watchedEpisodes: [],
        status: 'watching',
      });
    }).finally(() => setLoading(false));
  }, [showId]);

  const loadSeason = async (n: number) => {
    if (episodes[n]) { setOpenSeason(openSeason === n ? null : n); return; }
    const data = await tmdb.season(showId, n);
    setEpisodes((prev) => ({ ...prev, [n]: data.episodes }));
    setOpenSeason(n);
  };

  const markSeasonAll = (seasonNumber: number, eps: TMDBEpisode[], watched: boolean) => {
    eps.forEach((ep) => {
      if (watched) logEpisode(showId, { seasonNumber, episodeNumber: ep.episode_number });
      else unlogEpisode(showId, seasonNumber, ep.episode_number);
    });
  };

  if (loading) return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-64 bg-zinc-800 rounded-xl" />
      <div className="h-6 bg-zinc-800 rounded w-1/2" />
    </div>
  );
  if (!detail) return <div className="text-zinc-400 p-8">Not found</div>;

  const poster = posterUrl(detail.poster_path, 'w500');
  const backdrop = backdropUrl(detail.backdrop_path ?? null);
  const watchedCount = tracked?.watchedEpisodes.length ?? 0;
  const totalEps = detail.seasons.reduce((acc, s) => acc + (s.season_number > 0 ? s.episode_count : 0), 0);

  const statuses: Array<{ value: TrackedShowStatus; label: string }> = [
    { value: 'watching', label: 'Watching' },
    { value: 'completed', label: 'Completed' },
    { value: 'paused', label: 'Paused' },
    { value: 'dropped', label: 'Dropped' },
  ];

  return (
    <div>
      {/* Hero backdrop */}
      <div className="relative h-56 sm:h-80 overflow-hidden">
        {backdrop
          ? <img src={backdrop} alt="" className="w-full h-full object-cover object-top" />
          : <div className="w-full h-full bg-zinc-800" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-[#0e0e10]/60 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-24 sm:-mt-32 relative z-10 pb-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-5 sm:gap-8">
          {/* Poster */}
          <div className="w-28 sm:w-40 shrink-0 mx-auto sm:mx-0 shadow-2xl rounded-xl overflow-hidden ring-2 ring-white/5">
            {poster
              ? <img src={poster} alt={detail.name} className="w-full" />
              : <div className="aspect-[2/3] bg-zinc-700" />
            }
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4 pt-0 sm:pt-16">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-center sm:text-left">{detail.name}</h1>
              <div className="flex items-center justify-center sm:justify-start gap-4 mt-1 text-zinc-400 text-sm flex-wrap">
                <span>{detail.first_air_date?.slice(0, 4)}</span>
                <span>{detail.number_of_seasons} seasons</span>
                <span className="flex items-center gap-1 text-brand">
                  <Star size={12} fill="currentColor" /> {detail.vote_average.toFixed(1)}
                </span>
              </div>
            </div>

            <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">{detail.overview}</p>

            <div className="flex items-center gap-2 flex-wrap">
              {statuses.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setShowStatus(showId, s.value)}
                  className={`px-3.5 py-1.5 rounded-xl text-sm font-medium border transition ${
                    tracked?.status === s.value
                      ? 'bg-brand/15 border-brand/30 text-brand'
                      : 'bg-zinc-800 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <button
                onClick={() => inList ? removeFromWatchlist(showId, 'tv') : addToWatchlist(showId, 'tv')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium border transition ${
                  inList
                    ? 'bg-brand/10 border-brand/30 text-brand'
                    : 'bg-zinc-800 border-white/5 text-zinc-300 hover:text-white hover:bg-zinc-700'
                }`}
              >
                {inList ? <><BookmarkCheck size={13} /> In Watchlist</> : <><Bookmark size={13} /> Watchlist</>}
              </button>
              <button
                onClick={() => inFavorites ? removeFromFavorites(showId, 'tv') : addToFavorites(showId, 'tv')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium border transition ${
                  inFavorites
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-zinc-800 border-white/5 text-zinc-300 hover:text-white hover:bg-zinc-700'
                }`}
              >
                <Heart size={13} fill={inFavorites ? 'currentColor' : 'none'} />
                {inFavorites ? 'Favorited' : 'Favorite'}
              </button>
            </div>

            {watchedCount > 0 && (
              <div className="flex items-center gap-3 bg-zinc-800/60 border border-white/5 rounded-xl px-4 py-2.5 w-fit text-sm">
                <span className="text-zinc-400">{watchedCount} / {totalEps} episodes</span>
                <div className="w-28 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: `${Math.min(100, (watchedCount / totalEps) * 100)}%` }} />
                </div>
                <span className="text-brand font-medium">{Math.round((watchedCount / totalEps) * 100)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Seasons */}
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-300 uppercase tracking-widest">Seasons</h2>
          {detail.seasons.filter((s) => s.season_number > 0).map((season) => {
            const open = openSeason === season.season_number;
            const eps = episodes[season.season_number] ?? [];
            const watchedInSeason = eps.filter((e) => hasWatchedEpisode(showId, season.season_number, e.episode_number)).length;
            const allWatched = eps.length > 0 && watchedInSeason === eps.length;

            return (
              <div key={season.id} className="bg-zinc-800/60 border border-white/5 rounded-xl overflow-hidden">
                <button
                  onClick={() => loadSeason(season.season_number)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition text-left"
                >
                  <span className="text-white font-medium">{season.name}</span>
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    {watchedInSeason > 0 && (
                      <span className="text-brand text-xs font-medium">{watchedInSeason}/{season.episode_count}</span>
                    )}
                    <span className="text-xs">{season.episode_count} ep</span>
                    {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>
                </button>

                {open && eps.length > 0 && (
                  <div className="border-t border-white/5">
                    <div className="px-4 py-2 flex justify-end border-b border-white/5">
                      <button
                        onClick={() => markSeasonAll(season.season_number, eps, !allWatched)}
                        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-brand transition"
                      >
                        <CheckCheck size={13} /> {allWatched ? 'Unmark all' : 'Mark all watched'}
                      </button>
                    </div>
                    {eps.map((ep) => {
                      const watched = hasWatchedEpisode(showId, season.season_number, ep.episode_number);
                      return (
                        <div key={ep.id} className="flex items-center gap-3 px-4 py-3 border-t border-white/5 hover:bg-white/3 transition">
                          <span className="text-zinc-600 text-xs w-5 shrink-0 text-right">{ep.episode_number}</span>
                          <span className={`flex-1 text-sm ${watched ? 'text-white' : 'text-zinc-400'}`}>{ep.name}</span>
                          {ep.air_date && <span className="hidden sm:inline text-zinc-600 text-xs">{ep.air_date?.slice(0, 10)}</span>}
                          {ep.runtime && <span className="text-zinc-600 text-xs">{ep.runtime}m</span>}
                          <button
                            onClick={() => watched
                              ? unlogEpisode(showId, season.season_number, ep.episode_number)
                              : logEpisode(showId, { seasonNumber: season.season_number, episodeNumber: ep.episode_number })}
                            className={`p-1.5 rounded-full transition shrink-0 ${
                              watched
                                ? 'bg-brand text-black'
                                : 'bg-zinc-700 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {watched ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type TrackedShowStatus = 'watching' | 'completed' | 'paused' | 'dropped';
