import { useState } from 'react';
import { GitBranch, KeyRound, BookOpen } from 'lucide-react';
import { useAuth } from '../lib/auth';

export function Login() {
  const { login, loading, error } = useAuth();
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('');

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (token.trim() && repo.trim()) await login(token.trim(), repo.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/15 mb-2">
            <GitBranch size={28} className="text-brand" />
          </div>
          <h1 className="text-2xl font-bold text-white">Queued</h1>
          <p className="text-zinc-400 text-sm">
            Connect a private GitHub repo to store your data. Works on any device.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="GitHub token (ghp_…)"
              className="w-full bg-zinc-800 border border-white/5 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand/40"
              autoFocus
            />
          </div>
          <div className="relative">
            <BookOpen size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="owner/repo-name"
              className="w-full bg-zinc-800 border border-white/5 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand/40"
            />
          </div>
          {error && <p className="text-red-400 text-xs px-1">{error}</p>}
          <button
            type="submit"
            disabled={loading || !token.trim() || !repo.trim()}
            className="w-full bg-brand text-black font-semibold py-3 rounded-xl text-sm transition disabled:opacity-50"
          >
            {loading ? 'Connecting…' : 'Connect'}
          </button>
        </form>

        <div className="text-zinc-600 text-xs text-center leading-relaxed space-y-1">
          <p>Token needs the <span className="text-zinc-400">repo</span> scope.</p>
          <p>Repo should be private — your data will be stored as <span className="text-zinc-400">queued-data.json</span> in its root.</p>
        </div>
      </div>
    </div>
  );
}
