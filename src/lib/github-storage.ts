const TOKEN_KEY = 'github-pat';
const REPO_KEY = 'github-repo';
const FILE_PATH = 'queued-data.json';

export function saveToken(token: string) { localStorage.setItem(TOKEN_KEY, token); }
export function loadToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

export function saveRepo(repo: string) { localStorage.setItem(REPO_KEY, repo); }
export function loadRepo(): string | null { return localStorage.getItem(REPO_KEY); }
export function clearRepo() { localStorage.removeItem(REPO_KEY); }

async function ghFetch(token: string, path: string, options: RequestInit = {}) {
  return fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers ?? {}),
    },
  });
}

export async function validateToken(token: string): Promise<boolean> {
  try {
    return (await ghFetch(token, '/user')).ok;
  } catch {
    return false;
  }
}

export async function validateRepo(token: string, repo: string): Promise<boolean> {
  try {
    return (await ghFetch(token, `/repos/${repo}`)).ok;
  } catch {
    return false;
  }
}

async function getCurrentSha(token: string, repo: string): Promise<string | null> {
  const res = await ghFetch(token, `/repos/${repo}/contents/${FILE_PATH}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return ((await res.json()) as { sha: string }).sha;
}

export async function loadFromRepo(token: string, repo: string): Promise<Record<string, unknown> | null> {
  const res = await ghFetch(token, `/repos/${repo}/contents/${FILE_PATH}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const data = await res.json() as { content: string };
  const content = atob(data.content.replace(/\n/g, ''));
  if (!content || content.trim() === '{}') return null;
  return JSON.parse(content);
}

// Serialize all saves — never run two concurrently (prevents SHA conflicts)
let saveChain: Promise<void> = Promise.resolve();

export async function saveToRepo(token: string, repo: string, state: unknown): Promise<void> {
  // Chain onto the previous save so they run one at a time
  saveChain = saveChain.then(() => doSaveOnce(token, repo, state));
  return saveChain;
}

async function doSaveOnce(token: string, repo: string, state: unknown): Promise<void> {
  // Pretty-print so the file is readable on GitHub
  const json = JSON.stringify(state, null, 2);
  const content = btoa(unescape(encodeURIComponent(json)));

  // Retry once on 409 (stale SHA — can happen when saves race)
  for (let attempt = 0; attempt < 2; attempt++) {
    const sha = await getCurrentSha(token, repo);

    const body: Record<string, unknown> = { message: 'Update Queued data', content };
    if (sha) body.sha = sha;

    const res = await ghFetch(token, `/repos/${repo}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) return;

    if (res.status === 409 && attempt === 0) {
      // Stale SHA — refetch and retry
      console.warn('[sync] 409 conflict, retrying with fresh SHA…');
      continue;
    }

    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub ${res.status}: ${(err as { message?: string }).message ?? ''}`);
  }
}
