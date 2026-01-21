import * as semver from 'semver';
import type { ParsedSkillRef, ParsedVersion } from '../types/index.js';
import { getRemoteTags, getLatestTag, buildRepoUrl, getDefaultBranch, isGitUrl, parseGitUrl } from '../utils/git.js';

/**
 * GitResolver - 解析 skill 引用和版本
 * 
 * 引用格式:
 *   完整: <registry>:<owner>/<repo>@<version>
 *   简写: <owner>/<repo>@<version>
 *   Git URL: git@github.com:user/repo.git[@version]
 *   HTTPS: https://github.com/user/repo.git[@version]
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
   * 
   * 支持的格式:
   * - 简写: owner/repo[@version]
   * - 完整: registry:owner/repo[@version]
   * - SSH URL: git@github.com:user/repo.git[@version]
   * - HTTPS URL: https://github.com/user/repo.git[@version]
   * - Monorepo: git@github.com:org/repo.git/subpath[@version]
   */
  parseRef(ref: string): ParsedSkillRef {
    const raw = ref;

    // 首先检查是否是 Git URL（SSH, HTTPS, git://）
    // 对于 Git URL，需要特殊处理版本分隔符
    // 格式: git@host:user/repo.git[@version] 或 git@host:user/repo.git/subpath[@version]
    if (isGitUrl(ref)) {
      return this.parseGitUrlRef(ref);
    }

    // 非 Git URL 的标准格式解析
    let remaining = ref;
    let registry = this.defaultRegistry;
    let version: string | undefined;

    // 检查是否有 registry 前缀 (github:, gitlab:, custom.com:)
    const registryMatch = remaining.match(/^([a-zA-Z0-9.-]+):(.+)$/);
    if (registryMatch) {
      registry = registryMatch[1];
      remaining = registryMatch[2];
    }

    // 分离版本部分
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
   * 解析 Git URL 格式的引用
   * 
   * 支持的格式:
   * - git@github.com:user/repo.git
   * - git@github.com:user/repo.git@v1.0.0
   * - git@github.com:user/repo.git/subpath@v1.0.0
   * - https://github.com/user/repo.git
   * - https://github.com/user/repo.git@v1.0.0
   */
  private parseGitUrlRef(ref: string): ParsedSkillRef {
    const raw = ref;
    let gitUrl = ref;
    let version: string | undefined;
    let subPath: string | undefined;

    // 对于 .git 结尾的 URL，先检查是否有 /subpath@version 或 @version
    // 格式: url.git/subpath@version 或 url.git@version
    const gitSuffixIndex = ref.indexOf('.git');
    if (gitSuffixIndex !== -1) {
      const afterGit = ref.slice(gitSuffixIndex + 4);
      
      if (afterGit) {
        // 检查版本 (@version)
        const atIndex = afterGit.lastIndexOf('@');
        if (atIndex !== -1) {
          version = afterGit.slice(atIndex + 1);
          const pathPart = afterGit.slice(0, atIndex);
          if (pathPart.startsWith('/')) {
            subPath = pathPart.slice(1);
          }
        } else if (afterGit.startsWith('/')) {
          subPath = afterGit.slice(1);
        }
        
        // 提取纯净的 Git URL（不包含 subpath 和 version）
        gitUrl = ref.slice(0, gitSuffixIndex + 4);
      }
    } else {
      // 没有 .git 后缀的 URL，尝试分离版本
      const atIndex = ref.lastIndexOf('@');
      // 对于 SSH URL，@ 在开头是正常的 (git@...)，需要跳过
      if (atIndex > 4) { // 确保不是 git@host 中的 @
        version = ref.slice(atIndex + 1);
        gitUrl = ref.slice(0, atIndex);
      }
    }

    // 解析 Git URL 获取 host, owner, repo
    const parsed = parseGitUrl(gitUrl);
    if (!parsed) {
      throw new Error(`Invalid Git URL: ${ref}. Expected format: git@host:owner/repo.git or https://host/owner/repo.git`);
    }

    return {
      registry: parsed.host,
      owner: parsed.owner,
      repo: parsed.repo,
      subPath,
      version,
      raw,
      gitUrl,
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
   * 
   * 如果 parsed 中包含 gitUrl，则直接返回；
   * 否则根据 registry 和 owner/repo 构建 HTTPS URL
   */
  buildRepoUrl(parsed: ParsedSkillRef): string {
    // 如果有完整的 Git URL，直接返回
    if (parsed.gitUrl) {
      return parsed.gitUrl;
    }
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
