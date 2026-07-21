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

export async function loadFromGist(token: string): Promise<Record<string, unknown> | null> {
  const gistId = await findOrCreateGist(token);
  const { data } = await octokit(token).rest.gists.get({ gist_id: gistId });
  const content = data.files?.[GIST_FILENAME]?.content;
  if (!content || content === '{}') return null;
  return JSON.parse(content);
}

export async function saveToGist(token: string, state: unknown): Promise<void> {
  const gistId = await findOrCreateGist(token);
  const content = JSON.stringify(state);
  console.log(`[gist] updating gist ${gistId}, content length: ${content.length}`);
  const res = await octokit(token).rest.gists.update({
    gist_id: gistId,
    files: { [GIST_FILENAME]: { content } },
  });
  console.log(`[gist] update status: ${res.status}`);
}
