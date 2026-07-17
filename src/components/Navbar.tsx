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
  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 h-14">
        <Link to="/" className="text-purple-400 font-bold text-lg mr-6 shrink-0">
          TVTime
        </Link>
        {links.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== '/' && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
