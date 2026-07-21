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
  forceSync: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  token: null,
  loading: true,
  error: null,
  syncStatus: 'idle',
  login: async () => {},
  logout: () => {},
  forceSync: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function isEmptyState(data: Record<string, unknown>) {
  return (
    Object.keys((data.movies as object) ?? {}).length === 0 &&
    Object.keys((data.shows as object) ?? {}).length === 0 &&
    ((data.watchlist as unknown[]) ?? []).length === 0
  );
}

function currentStoreSnapshot() {
  const s = useStore.getState();
  return {
    movies: s.movies,
    shows: s.shows,
    watchlist: s.watchlist,
    favorites: s.favorites,
    hiddenShows: s.hiddenShows,
  };
}

function applyGistState(data: Record<string, unknown>) {
  useStore.setState({
    movies: (data.movies as ReturnType<typeof useStore.getState>['movies']) ?? {},
    shows: (data.shows as ReturnType<typeof useStore.getState>['shows']) ?? {},
    watchlist: (data.watchlist as ReturnType<typeof useStore.getState>['watchlist']) ?? [],
    favorites: (data.favorites as ReturnType<typeof useStore.getState>['favorites']) ?? [],
    hiddenShows: (data.hiddenShows as ReturnType<typeof useStore.getState>['hiddenShows']) ?? [],
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSave = useCallback(async (tok: string) => {
    setSyncStatus('saving');
    try {
      await saveToGist(tok, currentStoreSnapshot());
      setSyncStatus('saved');
    } catch {
      setSyncStatus('error');
    }
  }, []);

  const scheduleSync = useCallback((tok: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(tok), 1500);
  }, [doSave]);

  const forceSync = useCallback(async () => {
    const tok = loadToken();
    if (!tok) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await doSave(tok);
  }, [doSave]);

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
        // Gist has data — it's the source of truth, always load it
        applyGistState(remote);
      } else {
        // Gist is empty — push whatever is local so it's backed up
        await saveToGist(tok, currentStoreSnapshot());
      }
      setSyncStatus('saved');
    } catch {
      // proceed even if sync fails
    }
    setToken(tok);
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem('gist-id');
    setToken(null);
    setSyncStatus('idle');
  }, []);

  // On mount: if a token is stored, always load from Gist — it's the source of truth
  useEffect(() => {
    const stored = loadToken();
    if (!stored) { setLoading(false); return; }
    (async () => {
      const valid = await validateToken(stored);
      if (!valid) { clearToken(); setLoading(false); return; }
      try {
        const remote = await loadFromGist(stored);
        if (remote && !isEmptyState(remote)) {
          applyGistState(remote);
        }
        setSyncStatus('saved');
      } catch {
        setSyncStatus('error');
      }
      setToken(stored);
      setLoading(false);
    })();
  }, []);

  // Subscribe to store changes and sync to Gist after every change
  useEffect(() => {
    if (!token) return;
    const unsub = useStore.subscribe(() => scheduleSync(token));
    return unsub;
  }, [token, scheduleSync]);

  return (
    <AuthContext.Provider value={{ token, loading, error, syncStatus, login, logout, forceSync }}>
      {children}
    </AuthContext.Provider>
  );
}
