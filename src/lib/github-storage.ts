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
  const meta = await res.json() as { content: string; download_url: string; size: number };

  let json: string;

  // GitHub Contents API returns empty content for files >1MB — fetch raw instead
  if (meta.content && meta.content.trim()) {
    json = atob(meta.content.replace(/\n/g, ''));
  } else if (meta.download_url) {
    const raw = await fetch(meta.download_url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!raw.ok) throw new Error(`GitHub raw fetch ${raw.status}`);
    json = await raw.text();
  } else {
    return null;
  }

  if (!json || json.trim() === '{}') return null;
  return JSON.parse(json);
}

// Serialize all saves — never run two concurrently (prevents SHA conflicts)
let saveChain: Promise<void> = Promise.resolve();
let lastSavedJson = '';

export async function saveToRepo(token: string, repo: string, state: unknown): Promise<void> {
  // Chain saves so they run one at a time, but recover if one fails
  // so the queue is never permanently broken
  saveChain = saveChain
    .catch(() => {}) // absorb previous failure so the next save still runs
    .then(() => doSaveOnce(token, repo, state));
  return saveChain;
}

async function doSaveOnce(token: string, repo: string, state: unknown): Promise<void> {
  const json = JSON.stringify(state);

  // Skip if nothing changed since last successful save
  if (json === lastSavedJson) return;

  const content = btoa(unescape(encodeURIComponent(json)));

  // Retry up to 3 times on 409 (stale SHA)
  for (let attempt = 0; attempt < 3; attempt++) {
    const sha = await getCurrentSha(token, repo);

    const body: Record<string, unknown> = { message: 'Update Queued data', content };
    if (sha) body.sha = sha;

    const res = await ghFetch(token, `/repos/${repo}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      lastSavedJson = json;
      return;
    }

    if (res.status === 409) {
      console.warn(`[sync] 409 conflict (attempt ${attempt + 1}), retrying…`);
      continue;
    }

    const err = await res.json().catch(() => ({}));
    // Clear lastSavedJson so next attempt retries even if content is the same
    lastSavedJson = '';
    throw new Error(`GitHub ${res.status}: ${(err as { message?: string }).message ?? ''}`);
  }

  lastSavedJson = '';
  throw new Error('GitHub save failed after 3 attempts (SHA conflict)');
}
