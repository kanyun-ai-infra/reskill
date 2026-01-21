import * as semver from 'semver';
import type { ParsedSkillRef, ParsedVersion } from '../types/index.js';
import { getRemoteTags, getLatestTag, buildRepoUrl, getDefaultBranch } from '../utils/git.js';

/**
 * GitResolver - 解析 skill 引用和版本
 * 
 * 引用格式:
 *   完整: <registry>:<owner>/<repo>@<version>
 *   简写: <owner>/<repo>@<version>
 * 
 * 版本格式:
 *   - @v1.0.0       精确版本
 *   - @latest       最新 tag
 *   - @^2.0.0       semver 范围
 *   - @branch:dev   分支
 *   - @commit:abc   commit hash
 *   - (无)          默认分支
 */
export class GitResolver {
  private defaultRegistry: string;

  constructor(defaultRegistry = 'github') {
    this.defaultRegistry = defaultRegistry;
  }

  /**
   * 解析 skill 引用字符串
   */
  parseRef(ref: string): ParsedSkillRef {
    const raw = ref;
    let registry = this.defaultRegistry;
    let remaining = ref;

    // 检查是否有 registry 前缀 (github:, gitlab:, custom.com:)
    const registryMatch = remaining.match(/^([a-zA-Z0-9.-]+):(.+)$/);
    if (registryMatch) {
      registry = registryMatch[1];
      remaining = registryMatch[2];
    }

    // 分离版本部分
    let version: string | undefined;
    const atIndex = remaining.lastIndexOf('@');
    if (atIndex > 0) {
      version = remaining.slice(atIndex + 1);
      remaining = remaining.slice(0, atIndex);
    }

    // 解析 owner/repo 和可能的 subPath
    // 例如: user/repo 或 org/monorepo/skills/pdf
    const parts = remaining.split('/');
    
    if (parts.length < 2) {
      throw new Error(`Invalid skill reference: ${ref}. Expected format: owner/repo[@version]`);
    }

    const owner = parts[0];
    const repo = parts[1];
    const subPath = parts.length > 2 ? parts.slice(2).join('/') : undefined;

    return {
      registry,
      owner,
      repo,
      subPath,
      version,
      raw,
    };
  }

  /**
   * 解析版本规范
   */
  parseVersion(versionSpec?: string): ParsedVersion {
    if (!versionSpec) {
      return { type: 'branch', value: 'main', raw: '' };
    }

    const raw = versionSpec;

    // latest
    if (versionSpec === 'latest') {
      return { type: 'latest', value: 'latest', raw };
    }

    // branch:xxx
    if (versionSpec.startsWith('branch:')) {
      return { type: 'branch', value: versionSpec.slice(7), raw };
    }

    // commit:xxx
    if (versionSpec.startsWith('commit:')) {
      return { type: 'commit', value: versionSpec.slice(7), raw };
    }

    // semver range (^, ~, >, <, etc.)
    if (/^[\^~><]/.test(versionSpec)) {
      return { type: 'range', value: versionSpec, raw };
    }

    // exact version (v1.0.0 or 1.0.0)
    return { type: 'exact', value: versionSpec, raw };
  }

  /**
   * 构建仓库 URL
   */
  buildRepoUrl(parsed: ParsedSkillRef): string {
    return buildRepoUrl(parsed.registry, `${parsed.owner}/${parsed.repo}`);
  }

  /**
   * 解析版本并获取具体的 ref（tag 名或 commit）
   */
  async resolveVersion(
    repoUrl: string,
    versionSpec: ParsedVersion
  ): Promise<{ ref: string; commit?: string }> {
    switch (versionSpec.type) {
      case 'exact':
        // 直接使用指定的 tag
        return { ref: versionSpec.value };

      case 'latest': {
        // 获取最新 tag
        const latestTag = await getLatestTag(repoUrl);
        if (!latestTag) {
          // 没有 tag，使用默认分支
          const defaultBranch = await getDefaultBranch(repoUrl);
          return { ref: defaultBranch };
        }
        return { ref: latestTag.name, commit: latestTag.commit };
      }

      case 'range': {
        // 获取所有 tags，找到满足 semver 范围的最新版本
        const tags = await getRemoteTags(repoUrl);
        const matchingTags = tags.filter(tag => {
          const version = tag.name.replace(/^v/, '');
          return semver.satisfies(version, versionSpec.value);
        });

        if (matchingTags.length === 0) {
          throw new Error(`No version found matching ${versionSpec.raw} for ${repoUrl}`);
        }

        // 按版本排序，取最新的
        matchingTags.sort((a, b) => {
          const aVer = a.name.replace(/^v/, '');
          const bVer = b.name.replace(/^v/, '');
          return semver.compare(bVer, aVer);
        });

        return { ref: matchingTags[0].name, commit: matchingTags[0].commit };
      }

      case 'branch':
        return { ref: versionSpec.value };

      case 'commit':
        return { ref: versionSpec.value, commit: versionSpec.value };

      default:
        throw new Error(`Unknown version type: ${(versionSpec as ParsedVersion).type}`);
    }
  }

  /**
   * 完整解析：从引用字符串到可用于克隆的信息
   */
  async resolve(ref: string): Promise<{
    parsed: ParsedSkillRef;
    repoUrl: string;
    ref: string;
    commit?: string;
  }> {
    const parsed = this.parseRef(ref);
    const repoUrl = this.buildRepoUrl(parsed);
    const versionSpec = this.parseVersion(parsed.version);
    const resolved = await this.resolveVersion(repoUrl, versionSpec);

    return {
      parsed,
      repoUrl,
      ref: resolved.ref,
      commit: resolved.commit,
    };
  }
}

export default GitResolver;
