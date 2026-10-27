/**
 * The four GitHub REST calls the app needs: repository access, file tree, read and write a file.
 * Plain `fetch`, no SDK. Every failure is a `GitHubError` carrying the HTTP status (0 = network).
 */
import { decodeBase64, encodeBase64 } from './base64.ts';

const API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'GitHubError';
  }
}

export interface RepoInfo {
  defaultBranch: string;
  /** Read from the response headers when CORS exposes it. */
  tokenExpiresAt?: string;
}

export interface TreeEntry {
  path: string;
  sha: string;
}

export interface WrittenFile {
  sha: string;
  /** Server time of the commit, to detect a device clock that is off. */
  committedAt?: string;
}

const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/');

export class GitHubClient {
  constructor(private readonly token: string, private readonly repo: string, private readonly branch = 'main') {}

  /** Checks that the token can read the repository, and returns its default branch. */
  async repository(): Promise<RepoInfo> {
    const response = await this.request(`/repos/${this.repo}`);
    const body = (await response.json()) as { default_branch?: string };
    const expiration = response.headers.get('github-authentication-token-expiration');
    const expires = expiration ? new Date(expiration.replace(' UTC', 'Z').replace(' ', 'T')) : null;
    return {
      defaultBranch: body.default_branch ?? 'main',
      ...(expires && !Number.isNaN(expires.getTime()) ? { tokenExpiresAt: expires.toISOString() } : {}),
    };
  }

  /** Every file of the branch with its `sha`, in one request. An empty repository has no files. */
  async tree(): Promise<TreeEntry[]> {
    try {
      const response = await this.request(`/repos/${this.repo}/git/trees/${encodeURIComponent(this.branch)}?recursive=1`);
      const body = (await response.json()) as { tree: { path: string; sha: string; type: string }[] };
      return body.tree.filter((entry) => entry.type === 'blob').map(({ path, sha }) => ({ path, sha }));
    } catch (error) {
      if (error instanceof GitHubError && (error.status === 409 || error.status === 404)) return [];
      throw error;
    }
  }

  /** Text and `sha` of a file, or null when it does not exist. */
  async read(path: string): Promise<{ text: string; sha: string } | null> {
    try {
      const response = await this.request(`/repos/${this.repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(this.branch)}`);
      const body = (await response.json()) as { content?: string; encoding?: string; sha: string };
      if (body.encoding !== 'base64' || body.content === undefined) throw new GitHubError(500, `Unexpected content for ${path}`);
      return { text: decodeBase64(body.content), sha: body.sha };
    } catch (error) {
      if (error instanceof GitHubError && error.status === 404) return null;
      throw error;
    }
  }

  /** Creates (no `sha`) or replaces (`sha` of the version being replaced) a file, in one commit. */
  async write(path: string, text: string, sha: string | undefined, message: string): Promise<WrittenFile> {
    const response = await this.request(`/repos/${this.repo}/contents/${encodePath(path)}`, {
      method: 'PUT',
      body: JSON.stringify({ message, content: encodeBase64(text), branch: this.branch, ...(sha ? { sha } : {}) }),
    });
    const body = (await response.json()) as { content: { sha: string }; commit?: { committer?: { date?: string } } };
    return { sha: body.content.sha, committedAt: body.commit?.committer?.date };
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${API}${path}`, {
        ...init,
        cache: 'no-store',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
      });
    } catch (error) {
      throw new GitHubError(0, error instanceof Error ? error.message : 'Network error');
    }
    if (!response.ok) throw new GitHubError(response.status, `${init.method ?? 'GET'} ${path}: HTTP ${response.status}`);
    return response;
  }
}
