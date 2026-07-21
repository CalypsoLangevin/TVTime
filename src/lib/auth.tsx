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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoadRef = useRef(true);

  const scheduleSync = useCallback((tok: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const state = useStore.getState();
      try {
        await saveToGist(tok, {
          movies: state.movies,
          shows: state.shows,
          watchlist: state.watchlist,
          favorites: state.favorites,
        });
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
      if (remote) applyGistState(remote);
    } catch {
      // no remote data yet — start fresh
    }
    setToken(tok);
    setLoading(false);
  }, [applyGistState]);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem('gist-id');
    setToken(null);
  }, []);

  // On mount: check for stored token and load remote data
  useEffect(() => {
    const stored = loadToken();
    if (!stored) { setLoading(false); return; }
    (async () => {
      const valid = await validateToken(stored);
      if (!valid) { clearToken(); setLoading(false); return; }
      try {
        const remote = await loadFromGist(stored);
        if (remote) applyGistState(remote);
      } catch {
        // use localStorage state as fallback
      }
      setToken(stored);
      setLoading(false);
    })();
  }, [applyGistState]);

  // Subscribe to store changes and sync to Gist (skip the initial hydration)
  useEffect(() => {
    if (!token) return;
    const unsub = useStore.subscribe(() => {
      if (isFirstLoadRef.current) { isFirstLoadRef.current = false; return; }
      scheduleSync(token);
    });
    return unsub;
  }, [token, scheduleSync]);

  return (
    <AuthContext.Provider value={{ token, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
