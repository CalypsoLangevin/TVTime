import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { loadToken, saveToken, clearToken, validateToken, loadFromGist, saveToGist } from './gist';
import { useStore } from '../store';

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AuthState {
  token: string | null;
  loading: boolean;
  error: string | null;
  syncStatus: SyncStatus;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  token: null,
  loading: true,
  error: null,
  syncStatus: 'idle',
  login: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const LOCAL_SAVED_AT_KEY = 'queued-store-saved-at';

function isEmptyState(data: Record<string, unknown>) {
  return (
    Object.keys((data.movies as object) ?? {}).length === 0 &&
    Object.keys((data.shows as object) ?? {}).length === 0 &&
    ((data.watchlist as unknown[]) ?? []).length === 0
  );
}

function currentStoreSnapshot() {
  try {
    const raw = localStorage.getItem('queued-store');
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = parsed.state ?? parsed;
      return {
        movies: state.movies ?? {},
        shows: state.shows ?? {},
        watchlist: state.watchlist ?? [],
        favorites: state.favorites ?? [],
        hiddenShows: state.hiddenShows ?? [],
      };
    }
  } catch {}
  const s = useStore.getState();
  return {
    movies: s.movies,
    shows: s.shows,
    watchlist: s.watchlist,
    favorites: s.favorites,
    hiddenShows: s.hiddenShows,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<boolean>(false);

  const doSave = useCallback(async (tok: string) => {
    setSyncStatus('saving');
    try {
      const snapshot = { ...currentStoreSnapshot(), _savedAt: new Date().toISOString() };
      localStorage.setItem(LOCAL_SAVED_AT_KEY, snapshot._savedAt);
      await saveToGist(tok, snapshot);
      setSyncStatus('saved');
      pendingSaveRef.current = false;
    } catch {
      setSyncStatus('error');
    }
  }, []);

  const scheduleSync = useCallback((tok: string) => {
    pendingSaveRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(tok), 1500);
  }, [doSave]);

  const applyGistState = useCallback((data: Record<string, unknown>) => {
    useStore.setState({
      movies: (data.movies as ReturnType<typeof useStore.getState>['movies']) ?? {},
      shows: (data.shows as ReturnType<typeof useStore.getState>['shows']) ?? {},
      watchlist: (data.watchlist as ReturnType<typeof useStore.getState>['watchlist']) ?? [],
      favorites: (data.favorites as ReturnType<typeof useStore.getState>['favorites']) ?? [],
      hiddenShows: (data.hiddenShows as ReturnType<typeof useStore.getState>['hiddenShows']) ?? [],
    });
  }, []);

  const login = useCallback(async (tok: string) => {
    setError(null);
    setLoading(true);
    const valid = await validateToken(tok);
    if (!valid) {
      setError('Invalid token — make sure it has the gist scope.');
      setLoading(false);
      return;
    }
    saveToken(tok);
    try {
      const remote = await loadFromGist(tok);
      if (remote && !isEmptyState(remote)) {
        applyGistState(remote);
        const remoteSavedAt = (remote._savedAt as string) ?? '';
        localStorage.setItem(LOCAL_SAVED_AT_KEY, remoteSavedAt);
      } else {
        const snapshot = currentStoreSnapshot();
        if (!isEmptyState(snapshot)) {
          const ts = new Date().toISOString();
          localStorage.setItem(LOCAL_SAVED_AT_KEY, ts);
          await saveToGist(tok, { ...snapshot, _savedAt: ts });
        }
      }
    } catch {
      // proceed even if sync fails
    }
    setToken(tok);
    setLoading(false);
  }, [applyGistState]);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem('gist-id');
    localStorage.removeItem(LOCAL_SAVED_AT_KEY);
    setToken(null);
    setSyncStatus('idle');
  }, []);

  // On mount: check for stored token, sync with Gist — use whichever source is newer
  useEffect(() => {
    const stored = loadToken();
    if (!stored) { setLoading(false); return; }
    (async () => {
      const valid = await validateToken(stored);
      if (!valid) { clearToken(); setLoading(false); return; }
      try {
        const remote = await loadFromGist(stored);
        const localSavedAt = localStorage.getItem(LOCAL_SAVED_AT_KEY) ?? '';
        const remoteSavedAt = (remote?._savedAt as string) ?? '';

        if (remote && !isEmptyState(remote) && remoteSavedAt >= localSavedAt) {
          // Gist is newer (or same) — load from Gist
          applyGistState(remote);
          localStorage.setItem(LOCAL_SAVED_AT_KEY, remoteSavedAt);
        } else {
          // Local is newer or Gist is empty — push local state to Gist
          const snapshot = currentStoreSnapshot();
          if (!isEmptyState(snapshot)) {
            const ts = localSavedAt || new Date().toISOString();
            await saveToGist(stored, { ...snapshot, _savedAt: ts });
          }
        }
        setSyncStatus('saved');
      } catch {
        // use localStorage state as fallback
      }
      setToken(stored);
      setLoading(false);
    })();
  }, [applyGistState]);

  // Subscribe to store changes and sync to Gist
  useEffect(() => {
    if (!token) return;
    const unsub = useStore.subscribe(() => scheduleSync(token));
    return unsub;
  }, [token, scheduleSync]);

  // Flush pending save on page unload so closing the tab doesn't lose data
  useEffect(() => {
    if (!token) return;
    const handleUnload = () => {
      if (!pendingSaveRef.current) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const snapshot = { ...currentStoreSnapshot(), _savedAt: new Date().toISOString() };
      localStorage.setItem(LOCAL_SAVED_AT_KEY, snapshot._savedAt);
      // Use sendBeacon for best-effort fire-and-forget — but Gist API isn't beacon-compatible,
      // so we do a synchronous save attempt via keepalive fetch isn't available either.
      // Best we can do: the localStorage timestamp is updated, so next open picks it up correctly.
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, loading, error, syncStatus, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
