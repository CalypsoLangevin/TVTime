import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const ref = useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <form onSubmit={submit} className="relative w-full max-w-xl">
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
      <input
        ref={ref}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder='Search movies & shows…'
        className="w-full bg-zinc-800/80 backdrop-blur-sm text-white placeholder-zinc-500 pl-10 pr-9 py-3 rounded-xl text-sm border border-white/5 focus:border-amber-500/50 focus:outline-none focus:bg-zinc-800 transition"
      />
      {query && (
        <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
          <X size={14} />
        </button>
      )}
    </form>
  );
}
