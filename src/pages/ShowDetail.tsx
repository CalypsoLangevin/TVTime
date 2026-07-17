import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Eye, EyeOff, Bookmark, BookmarkCheck, Star, CheckCheck } from 'lucide-react';
import { tmdb, posterUrl } from '../lib/tmdb';
import { useStore } from '../store';
import type { TMDBEpisode, TMDBShowDetails } from '../types';

export function ShowDetail() {
  const { id } = useParams<{ id: string }>();
  const showId = Number(id);
  const [detail, setDetail] = useState<TMDBShowDetails | null>(null);
  const [episodes, setEpisodes] = useState<Record<number, TMDBEpisode[]>>({});
  const [openSeason, setOpenSeason] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const { shows, addShow, setShowStatus, logEpisode, unlogEpisode, hasWatchedEpisode, isInWatchlist, addToWatchlist, removeFromWatchlist } = useStore();
  const tracked = shows[showId];
  const inList = isInWatchlist(showId, 'tv');

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

  if (loading) return <div className="text-gray-400 p-8">Loading…</div>;
  if (!detail) return <div className="text-gray-400 p-8">Not found</div>;

  const img = posterUrl(detail.poster_path, 'w500');
  const watchedCount = tracked?.watchedEpisodes.length ?? 0;
  const totalEps = detail.seasons.reduce((acc, s) => acc + (s.season_number > 0 ? s.episode_count : 0), 0);

  const statuses: Array<{ value: typeof tracked['status']; label: string }> = [
    { value: 'watching', label: 'Watching' },
    { value: 'completed', label: 'Completed' },
    { value: 'paused', label: 'Paused' },
    { value: 'dropped', label: 'Dropped' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex gap-8">
        <div className="w-40 shrink-0">
          {img ? <img src={img} alt={detail.name} className="rounded-xl w-full shadow-lg" /> : <div className="aspect-[2/3] bg-gray-800 rounded-xl" />}
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{detail.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-gray-400 text-sm">
              <span>{detail.first_air_date?.slice(0, 4)}</span>
              <span>{detail.number_of_seasons} seasons</span>
              <span className="flex items-center gap-1 text-yellow-400">
                <Star size={13} fill="currentColor" /> {detail.vote_average.toFixed(1)}
              </span>
            </div>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed max-w-2xl">{detail.overview}</p>

          <div className="flex items-center gap-2 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s.value}
                onClick={() => setShowStatus(showId, s.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${tracked?.status === s.value ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                {s.label}
              </button>
            ))}
            <button
              onClick={() => inList ? removeFromWatchlist(showId, 'tv') : addToWatchlist(showId, 'tv')}
              className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm transition"
            >
              {inList ? <><BookmarkCheck size={14} className="text-purple-400" /> In Watchlist</> : <><Bookmark size={14} /> Watchlist</>}
            </button>
          </div>

          {watchedCount > 0 && (
            <div className="bg-gray-800 rounded-xl p-3 inline-flex items-center gap-4 text-sm">
              <span className="text-gray-400">{watchedCount} / {totalEps} episodes</span>
              <div className="w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (watchedCount / totalEps) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-white">Seasons</h2>
        {detail.seasons.filter((s) => s.season_number > 0).map((season) => {
          const open = openSeason === season.season_number;
          const eps = episodes[season.season_number] ?? [];
          const watchedInSeason = eps.filter((e) => hasWatchedEpisode(showId, season.season_number, e.episode_number)).length;
          const allWatched = eps.length > 0 && watchedInSeason === eps.length;

          return (
            <div key={season.id} className="bg-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => loadSeason(season.season_number)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-750 text-left"
              >
                <span className="text-white font-medium">{season.name}</span>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span>{watchedInSeason > 0 ? `${watchedInSeason}/` : ''}{season.episode_count} episodes</span>
                  {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {open && eps.length > 0 && (
                <div className="border-t border-gray-700">
                  <div className="px-4 py-2 flex justify-end">
                    <button
                      onClick={() => markSeasonAll(season.season_number, eps, !allWatched)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition"
                    >
                      <CheckCheck size={13} /> {allWatched ? 'Unmark all' : 'Mark all watched'}
                    </button>
                  </div>
                  {eps.map((ep) => {
                    const watched = hasWatchedEpisode(showId, season.season_number, ep.episode_number);
                    return (
                      <div key={ep.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-700/50 hover:bg-gray-700/30">
                        <span className="text-gray-500 text-xs w-6 shrink-0">{ep.episode_number}</span>
                        <span className={`flex-1 text-sm ${watched ? 'text-white' : 'text-gray-400'}`}>{ep.name}</span>
                        {ep.air_date && <span className="text-gray-500 text-xs">{ep.air_date?.slice(0, 10)}</span>}
                        {ep.runtime && <span className="text-gray-500 text-xs">{ep.runtime}m</span>}
                        <button
                          onClick={() => watched ? unlogEpisode(showId, season.season_number, ep.episode_number) : logEpisode(showId, { seasonNumber: season.season_number, episodeNumber: ep.episode_number })}
                          className={`p-1.5 rounded-full transition ${watched ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
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
  );
}
