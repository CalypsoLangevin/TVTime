import { useState, useRef } from 'react';
import { useStore } from '../store';
import type { TrackedMovie } from '../types';

const BASE = 'https://api.themoviedb.org/3';
const KEY = import.meta.env.VITE_TMDB_API_KEY ?? '';

interface CsvRow {
  imdb_id: string;
  title: string;
  year: string;
  watched_at: string;
  is_watched: string;
  rewatch_count: string;
  created_at: string;
}

interface ImportResult {
  title: string;
  status: 'imported' | 'watchlist' | 'skipped' | 'error';
  reason?: string;
}

async function findByImdbId(imdbId: string) {
  const url = new URL(`${BASE}/find/${imdbId}`);
  url.searchParams.set('api_key', KEY);
  url.searchParams.set('external_source', 'imdb_id');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  const data = await res.json();
  return data.movie_results?.[0] ?? null;
}

async function fetchMovieDetails(tmdbId: number) {
  const url = new URL(`${BASE}/movie/${tmdbId}`);
  url.searchParams.set('api_key', KEY);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    // Handle quoted fields with commas inside
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += line[i];
      }
    }
    fields.push(current);
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (fields[i] ?? '').trim()])) as unknown as CsvRow;
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function Import() {
  const [results, setResults] = useState<ImportResult[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const store = useStore();

  async function handleFile(file: File) {
    const text = await file.text();
    const rows = parseCsv(text);
    const watched = rows.filter((r) => r.is_watched === 'true' || r.is_watched === 'false');

    setRunning(true);
    setDone(false);
    setResults([]);
    setTotal(watched.length);
    setProgress(0);

    const resultList: ImportResult[] = [];

    for (const row of watched) {
      const rewatchCount = parseInt(row.rewatch_count ?? '0', 10) || 0;
      const isWatched = row.is_watched === 'true';

      try {
        let tmdbMovie: { id: number; title: string; poster_path: string | null; release_date: string; runtime: number | null } | null = null;

        if (row.imdb_id) {
          const found = await findByImdbId(row.imdb_id);
          if (found) {
            const details = await fetchMovieDetails(found.id);
            tmdbMovie = {
              id: details.id,
              title: details.title,
              poster_path: details.poster_path,
              release_date: details.release_date,
              runtime: details.runtime ?? null,
            };
          }
        }

        if (!tmdbMovie) {
          resultList.push({ title: row.title, status: 'skipped', reason: 'Not found on TMDB' });
          setResults([...resultList]);
          setProgress((p) => p + 1);
          await sleep(300);
          continue;
        }

        if (isWatched) {
          const watchCount = rewatchCount + 1;
          const trackedMovie: TrackedMovie = {
            ...tmdbMovie,
            watchCount,
            lastWatched: row.watched_at || row.created_at,
          };

          // Write directly into store state — bypass logMovie to set exact watchCount
          useStore.setState((s) => ({
            movies: {
              ...s.movies,
              [tmdbMovie!.id]: trackedMovie,
            },
          }));

          resultList.push({ title: tmdbMovie.title, status: 'imported' });
        } else {
          // Add to watchlist
          store.addToWatchlist(tmdbMovie.id, 'movie');
          resultList.push({ title: tmdbMovie.title, status: 'watchlist' });
        }
      } catch (e) {
        resultList.push({ title: row.title, status: 'error', reason: String(e) });
      }

      setResults([...resultList]);
      setProgress((p) => p + 1);
      // Rate limit: TMDB allows ~40 req/s, we do 2 per row so stay safe
      await sleep(100);
    }

    setRunning(false);
    setDone(true);
  }

  const imported = results.filter((r) => r.status === 'imported').length;
  const watchlisted = results.filter((r) => r.status === 'watchlist').length;
  const skipped = results.filter((r) => r.status === 'skipped' || r.status === 'error').length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Import from TV Time</h1>
      <p className="text-zinc-400 mb-6 text-sm">
        Upload your TV Time CSV export. Watched movies will be imported with their watch counts; unwatched ones go to your Watchlist.
      </p>

      {!running && !done && (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 rounded-xl p-10 cursor-pointer hover:border-brand transition-colors">
          <span className="text-zinc-400 mb-2">Drop CSV file here or click to browse</span>
          <span className="text-xs text-zinc-600">tvtime-movies-*.csv</span>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      )}

      {(running || done) && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-zinc-800 rounded-full h-2">
              <div
                className="bg-brand h-2 rounded-full transition-all duration-300"
                style={{ width: total ? `${(progress / total) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-sm text-zinc-400 whitespace-nowrap">{progress} / {total}</span>
          </div>

          {done && (
            <div className="flex gap-4 text-sm">
              <span className="text-green-400">✓ {imported} imported</span>
              <span className="text-zinc-400">⊕ {watchlisted} to watchlist</span>
              <span className="text-red-400">✗ {skipped} skipped</span>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto space-y-1 pr-1">
            {[...results].reverse().map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm py-1 border-b border-zinc-800">
                <span className={
                  r.status === 'imported' ? 'text-green-400' :
                  r.status === 'watchlist' ? 'text-zinc-400' :
                  'text-red-400'
                }>
                  {r.status === 'imported' ? '✓' : r.status === 'watchlist' ? '⊕' : '✗'}
                </span>
                <span className="flex-1 truncate text-zinc-200">{r.title}</span>
                {r.reason && <span className="text-xs text-zinc-500 shrink-0">{r.reason}</span>}
              </div>
            ))}
          </div>

          {done && (
            <button
              onClick={() => {
                setDone(false);
                setResults([]);
                setProgress(0);
                setTotal(0);
                if (fileRef.current) fileRef.current.value = '';
              }}
              className="mt-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
            >
              Import another file
            </button>
          )}
        </div>
      )}
    </div>
  );
}
