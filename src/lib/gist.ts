import { Octokit } from '@octokit/rest';

const GIST_FILENAME = 'cinema-tracker-data.json';
const TOKEN_KEY = 'github-pat';
const GIST_ID_KEY = 'gist-id';

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function loadToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function octokit(token: string) {
  return new Octokit({ auth: token });
}

export async function validateToken(token: string): Promise<boolean> {
  try {
    await octokit(token).rest.users.getAuthenticated();
    return true;
  } catch {
    return false;
  }
}

async function findOrCreateGist(token: string): Promise<string> {
  const cached = localStorage.getItem(GIST_ID_KEY);
  if (cached) return cached;

  const kit = octokit(token);
  const { data: gists } = await kit.rest.gists.list({ per_page: 100 });
  const existing = gists.find((g) => g.files?.[GIST_FILENAME]);

  if (existing) {
    localStorage.setItem(GIST_ID_KEY, existing.id);
    return existing.id;
  }

  const { data } = await kit.rest.gists.create({
    description: 'Cinema Tracker data',
    public: false,
    files: { [GIST_FILENAME]: { content: '{}' } },
  });
  const id = data.id!;
  localStorage.setItem(GIST_ID_KEY, id);
  return id;
}

async function fetchGistContent(token: string, gistId: string): Promise<string | null> {
  const { data } = await octokit(token).rest.gists.get({ gist_id: gistId });
  const file = data.files?.[GIST_FILENAME];
  if (!file) return null;
  // GitHub API truncates inline content at 1MB — fetch raw URL for large files
  if (file.truncated && file.raw_url) {
    console.log('[gist] content truncated, fetching via raw_url');
    const res = await fetch(file.raw_url, {
      headers: { Authorization: `token ${token}` },
    });
    if (!res.ok) throw new Error(`raw fetch ${res.status}`);
    return res.text();
  }
  return file.content ?? null;
}

export async function loadFromGist(token: string): Promise<Record<string, unknown> | null> {
  let gistId = await findOrCreateGist(token);
  try {
    const content = await fetchGistContent(token, gistId);
    if (!content || content === '{}') return null;
    return JSON.parse(content);
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status;
    if (status === 404) {
      console.warn('[gist] 404 on load, clearing cached ID and retrying');
      localStorage.removeItem(GIST_ID_KEY);
      gistId = await findOrCreateGist(token);
      const content = await fetchGistContent(token, gistId);
      if (!content || content === '{}') return null;
      return JSON.parse(content);
    }
    throw e;
  }
}

export async function saveToGist(token: string, state: unknown): Promise<void> {
  const content = JSON.stringify(state);
  console.log(`[gist] saving ${Math.round(content.length / 1024)}kb`);
  let gistId = await findOrCreateGist(token);
  try {
    const res = await octokit(token).rest.gists.update({
      gist_id: gistId,
      files: { [GIST_FILENAME]: { content } },
    });
    console.log(`[gist] saved ok (status ${res.status})`);
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status;
    if (status === 404) {
      // Cached gist ID is stale — clear it and create a fresh one
      console.warn('[gist] 404 on update, clearing cached ID and retrying');
      localStorage.removeItem(GIST_ID_KEY);
      gistId = await findOrCreateGist(token);
      await octokit(token).rest.gists.update({
        gist_id: gistId,
        files: { [GIST_FILENAME]: { content } },
      });
      console.log('[gist] retry saved ok');
    } else {
      throw e;
    }
  }
}
