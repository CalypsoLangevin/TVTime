import { Link, useLocation } from 'react-router-dom';
import { Tv, Film, Bookmark, BarChart3, Search } from 'lucide-react';

const links = [
  { to: '/', label: 'Discover', icon: Search },
  { to: '/movies', label: 'Movies', icon: Film },
  { to: '/shows', label: 'Shows', icon: Tv },
  { to: '/watchlist', label: 'Watchlist', icon: Bookmark },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
];

export function Navbar() {
  const { pathname } = useLocation();

  const isActive = (to: string) => to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <>
      {/* Desktop top nav */}
      <nav className="hidden sm:block bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 h-14">
          <Link to="/" className="text-purple-400 font-bold text-lg mr-6 shrink-0">
            TVTime
          </Link>
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(to) ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800">
        <div className="flex items-stretch h-16">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
                isActive(to) ? 'text-purple-400' : 'text-gray-500'
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
