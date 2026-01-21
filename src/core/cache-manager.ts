import * as path from 'node:path';
import type { ParsedSkillRef } from '../types/index.js';
import {
  copyDir,
  ensureDir,
  exists,
  getCacheDir,
  isDirectory,
  listDir,
  remove,
} from '../utils/fs.js';
import { clone, getCurrentCommit } from '../utils/git.js';

/**
 * CacheManager - Manage global skill cache
 *
 * Cache directory structure:
 * ~/.reskill-cache/
 * ├── github/                          # Shorthand format registry
 * │   └── user/
 * │       └── skill/
 * │           ├── v1.0.0/
 * │           └── v1.1.0/
 * ├── github.com/                      # Git URL format, using host as directory
 * │   └── user/
 * │       └── private-skill/
 * │           └── v1.0.0/
 * └── gitlab.company.com/              # Private GitLab instance
 *     └── team/
 *         └── skill/
 *             └── v2.0.0/
 *
 * For Git URL format (SSH/HTTPS):
 * - git@github.com:user/repo.git -> github.com/user/repo/version
 * - https://gitlab.company.com/team/skill.git -> gitlab.company.com/team/skill/version
 */
export class CacheManager {
  private cacheDir: string;

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir || getCacheDir();
  }

  /**
   * Get cache directory
   */
  getCacheDir(): string {
    return this.cacheDir;
  }

  /**
   * Get skill path in cache
   *
   * For different reference formats, cache paths are:
   * - github:user/repo@v1.0.0 -> ~/.reskill-cache/github/user/repo/v1.0.0
   * - git@github.com:user/repo.git@v1.0.0 -> ~/.reskill-cache/github.com/user/repo/v1.0.0
   * - https://gitlab.company.com/team/skill.git@v2.0.0 -> ~/.reskill-cache/gitlab.company.com/team/skill/v2.0.0
   */
  getSkillCachePath(parsed: ParsedSkillRef, version: string): string {
    return path.join(this.cacheDir, parsed.registry, parsed.owner, parsed.repo, version);
  }

  /**
   * Get cache path (alias for getSkillCachePath)
   */
  getCachePath(parsed: ParsedSkillRef, version: string): string {
    return this.getSkillCachePath(parsed, version);
  }

  /**
   * Check if skill is cached
   */
  isCached(parsed: ParsedSkillRef, version: string): boolean {
    const cachePath = this.getSkillCachePath(parsed, version);
    return exists(cachePath) && isDirectory(cachePath);
  }

  /**
   * Get cached skill
   */
  async get(
    parsed: ParsedSkillRef,
    version: string,
  ): Promise<{ path: string; commit: string } | null> {
    const cachePath = this.getSkillCachePath(parsed, version);

    if (!this.isCached(parsed, version)) {
      return null;
    }

    // Read cached commit info
    const commitFile = path.join(cachePath, '.reskill-commit');
    let commit = '';

    try {
      const fs = await import('node:fs');
      if (exists(commitFile)) {
        commit = fs.readFileSync(commitFile, 'utf-8').trim();
      }
    } catch {
      // Ignore read errors
    }

    return { path: cachePath, commit };
  }

  /**
   * Cache skill
   */
  async cache(
    repoUrl: string,
    parsed: ParsedSkillRef,
    ref: string,
    version: string,
  ): Promise<{ path: string; commit: string }> {
    const cachePath = this.getSkillCachePath(parsed, version);

    // If exists, delete first
    if (exists(cachePath)) {
      remove(cachePath);
    }

    ensureDir(path.dirname(cachePath));

    // Clone repository
    const tempPath = `${cachePath}.tmp`;
    remove(tempPath);

    await clone(repoUrl, tempPath, { depth: 1, branch: ref });

    // Get commit hash
    const commit = await getCurrentCommit(tempPath);

    // If has subPath, only keep subdirectory
    if (parsed.subPath) {
      const subDir = path.join(tempPath, parsed.subPath);
      if (!exists(subDir)) {
        remove(tempPath);
        throw new Error(`Subpath ${parsed.subPath} not found in repository`);
      }
      copyDir(subDir, cachePath, { exclude: ['.git'] });
    } else {
      copyDir(tempPath, cachePath, { exclude: ['.git'] });
    }

    // Save commit info
    const fs = await import('node:fs');
    fs.writeFileSync(path.join(cachePath, '.reskill-commit'), commit);

    // Clean up temp directory
    remove(tempPath);

    return { path: cachePath, commit };
  }

  /**
   * Copy from cache to target directory
   */
  async copyTo(parsed: ParsedSkillRef, version: string, destPath: string): Promise<void> {
    const cached = await this.get(parsed, version);

    if (!cached) {
      throw new Error(`Skill ${parsed.raw} version ${version} not found in cache`);
    }

    // If target exists, delete first
    if (exists(destPath)) {
      remove(destPath);
    }

    copyDir(cached.path, destPath, { exclude: ['.reskill-commit'] });
  }

  /**
   * Clear cache for specific skill
   */
  clearSkill(parsed: ParsedSkillRef, version?: string): void {
    if (version) {
      const cachePath = this.getSkillCachePath(parsed, version);
      remove(cachePath);
    } else {
      // Clear all versions
      const skillDir = path.join(this.cacheDir, parsed.registry, parsed.owner, parsed.repo);
      remove(skillDir);
    }
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    remove(this.cacheDir);
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalSkills: number; registries: string[] } {
    if (!exists(this.cacheDir)) {
      return { totalSkills: 0, registries: [] };
    }

    const registries = listDir(this.cacheDir).filter((name) =>
      isDirectory(path.join(this.cacheDir, name)),
    );

    let totalSkills = 0;

    for (const registry of registries) {
      const registryPath = path.join(this.cacheDir, registry);
      const owners = listDir(registryPath).filter((name) =>
        isDirectory(path.join(registryPath, name)),
      );

      for (const owner of owners) {
        const ownerPath = path.join(registryPath, owner);
        const repos = listDir(ownerPath).filter((name) => isDirectory(path.join(ownerPath, name)));
        totalSkills += repos.length;
      }
    }

    return { totalSkills, registries };
  }
}

export default CacheManager;
