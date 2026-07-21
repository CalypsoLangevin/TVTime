import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { loadToken, saveToken, clearToken, validateToken, loadFromGist, saveToGist } from './gist';
import { useStore } from '../store';

interface AuthState {
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  token: null,
  loading: true,
  error: null,
  login: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function currentStoreSnapshot() {
  // Read directly from localStorage to avoid Zustand persist hydration timing issues
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
      };
    }
  } catch {}
  const s = useStore.getState();
  return { movies: s.movies, shows: s.shows, watchlist: s.watchlist, favorites: s.favorites };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSync = useCallback((tok: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveToGist(tok, currentStoreSnapshot());
      } catch {
        // silent — next change will retry
      }
    }, 1500);
  }, []);

  const applyGistState = useCallback((data: Record<string, unknown>) => {
    useStore.setState({
      movies: (data.movies as ReturnType<typeof useStore.getState>['movies']) ?? {},
      shows: (data.shows as ReturnType<typeof useStore.getState>['shows']) ?? {},
      watchlist: (data.watchlist as ReturnType<typeof useStore.getState>['watchlist']) ?? [],
      favorites: (data.favorites as ReturnType<typeof useStore.getState>['favorites']) ?? [],
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
      if (remote) {
        applyGistState(remote);
      } else {
        // Remote is empty — only upload if this device actually has data
        const snapshot = currentStoreSnapshot();
        const hasData = Object.keys(snapshot.movies).length > 0 ||
          Object.keys(snapshot.shows).length > 0 ||
          snapshot.watchlist.length > 0;
        if (hasData) await saveToGist(tok, snapshot);
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
    setToken(null);
  }, []);

  // On mount: check for stored token, sync with Gist
  useEffect(() => {
    const stored = loadToken();
    if (!stored) { setLoading(false); return; }
    (async () => {
      const valid = await validateToken(stored);
      if (!valid) { clearToken(); setLoading(false); return; }
      try {
        const remote = await loadFromGist(stored);
        if (remote) {
          applyGistState(remote);
        } else {
          // Gist is empty — push local data up (first login on this device uploaded nothing)
          const snapshot = currentStoreSnapshot();
          const hasData = Object.keys(snapshot.movies).length > 0 ||
            Object.keys(snapshot.shows).length > 0 ||
            snapshot.watchlist.length > 0;
          if (hasData) await saveToGist(stored, snapshot);
        }
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

  return (
    <AuthContext.Provider value={{ token, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
