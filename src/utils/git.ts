import { execSync, exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Git utilities
 */

export interface GitTag {
  name: string;
  commit: string;
}

/**
 * Execute git command synchronously
 */
export function gitSync(args: string[], cwd?: string): string {
  const result = execSync(`git ${args.join(' ')}`, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return result.trim();
}

/**
 * Execute git command asynchronously
 */
export async function git(args: string[], cwd?: string): Promise<string> {
  const { stdout } = await execAsync(`git ${args.join(' ')}`, {
    cwd,
    encoding: 'utf-8',
  });
  return stdout.trim();
}

/**
 * Get remote tags for a repository
 */
export async function getRemoteTags(repoUrl: string): Promise<GitTag[]> {
  try {
    const output = await git(['ls-remote', '--tags', '--refs', repoUrl]);
    
    if (!output) {
      return [];
    }

    const tags: GitTag[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      const [commit, ref] = line.split('\t');
      if (commit && ref) {
        // Extract tag name from refs/tags/v1.0.0
        const tagName = ref.replace('refs/tags/', '');
        tags.push({ name: tagName, commit });
      }
    }

    return tags;
  } catch {
    return [];
  }
}

/**
 * Get latest tag from repository
 */
export async function getLatestTag(repoUrl: string): Promise<GitTag | null> {
  const tags = await getRemoteTags(repoUrl);
  
  if (tags.length === 0) {
    return null;
  }

  // Sort by semver (simple version sort)
  const sortedTags = tags.sort((a, b) => {
    const aVer = a.name.replace(/^v/, '');
    const bVer = b.name.replace(/^v/, '');
    return compareVersions(bVer, aVer);
  });

  return sortedTags[0];
}

/**
 * Clone a repository with shallow clone
 */
export async function clone(
  repoUrl: string,
  destPath: string,
  options?: { branch?: string; depth?: number }
): Promise<void> {
  const args = ['clone'];
  
  if (options?.depth) {
    args.push('--depth', options.depth.toString());
  }
  
  if (options?.branch) {
    args.push('--branch', options.branch);
  }
  
  args.push(repoUrl, destPath);
  
  await git(args);
}

/**
 * Checkout a specific ref (tag, branch, commit)
 */
export async function checkout(ref: string, cwd: string): Promise<void> {
  await git(['checkout', ref], cwd);
}

/**
 * Fetch tags from remote
 */
export async function fetchTags(cwd: string): Promise<void> {
  await git(['fetch', '--tags'], cwd);
}

/**
 * Get current commit hash
 */
export async function getCurrentCommit(cwd: string): Promise<string> {
  return git(['rev-parse', 'HEAD'], cwd);
}

/**
 * Get default branch name
 */
export async function getDefaultBranch(repoUrl: string): Promise<string> {
  try {
    const output = await git(['ls-remote', '--symref', repoUrl, 'HEAD']);
    const match = output.match(/ref: refs\/heads\/(\S+)/);
    return match ? match[1] : 'main';
  } catch {
    return 'main';
  }
}

/**
 * Check if a ref exists in remote
 */
export async function refExists(repoUrl: string, ref: string): Promise<boolean> {
  try {
    const output = await git(['ls-remote', repoUrl, ref]);
    return output.length > 0;
  } catch {
    return false;
  }
}

/**
 * Simple version comparison (for sorting)
 */
function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(p => parseInt(p, 10) || 0);
  const bParts = b.split('.').map(p => parseInt(p, 10) || 0);
  
  const maxLength = Math.max(aParts.length, bParts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const aPart = aParts[i] || 0;
    const bPart = bParts[i] || 0;
    
    if (aPart > bPart) return 1;
    if (aPart < bPart) return -1;
  }
  
  return 0;
}

/**
 * Build repository URL from registry and path
 */
export function buildRepoUrl(registry: string, ownerRepo: string): string {
  // Handle known registries
  const registryUrls: Record<string, string> = {
    github: 'https://github.com',
    gitlab: 'https://gitlab.com',
  };

  const baseUrl = registryUrls[registry] || `https://${registry}`;
  return `${baseUrl}/${ownerRepo}`;
}
