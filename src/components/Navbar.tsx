import { Link, useLocation } from 'react-router-dom';
import { Tv, Film, Bookmark, BarChart3, Search, Upload, LogOut, Cloud, CloudOff, Loader, Sun, Moon } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useStore } from '../store';

const links = [
  { to: '/', label: 'Discover', icon: Search },
  { to: '/movies', label: 'Movies', icon: Film },
  { to: '/shows', label: 'Shows', icon: Tv },
  { to: '/watchlist', label: 'Watchlist', icon: Bookmark },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
];

const desktopExtra = [
  { to: '/import', label: 'Import', icon: Upload },
];

function SyncIndicator() {
  const { syncStatus, token } = useAuth();
  if (!token) return null;

  if (syncStatus === 'saving') {
    return (
      <span title="Saving…" className="text-zinc-500 animate-spin">
        <Loader size={14} />
      </span>
    );
  }
  if (syncStatus === 'error') {
    return (
      <span title="Sync failed — will retry on next change" className="text-red-400">
        <CloudOff size={14} />
      </span>
    );
  }
  if (syncStatus === 'saved') {
    return (
      <span title="Synced" className="text-zinc-600">
        <Cloud size={14} />
      </span>
    );
  }
  return null;
}

export function Navbar() {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const isActive = (to: string) => to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <>
      {/* Desktop top nav */}
      <nav className="hidden sm:block sticky top-0 z-50 bg-[#0D1F26]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 h-14">
          <Link to="/" className="font-bold text-lg mr-6 shrink-0 text-brand tracking-wide">
            Queued
          </Link>
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(to)
                  ? 'bg-brand/15 text-brand'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
          <div className="flex-1" />
          <SyncIndicator />
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          {desktopExtra.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(to)
                  ? 'bg-brand/15 text-brand'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-500 hover:text-white hover:bg-white/5 transition-colors ml-1"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0D1F26]/90 backdrop-blur-md border-t border-white/5">
        <div className="flex items-stretch h-16">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
                isActive(to) ? 'text-brand' : 'text-zinc-500'
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-zinc-500 transition-colors"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </nav>
    </>
  );
}
