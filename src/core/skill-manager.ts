import * as path from 'node:path';
import type { InstalledSkill, SkillJson, InstallOptions } from '../types/index.js';
import { GitResolver } from './git-resolver.js';
import { CacheManager } from './cache-manager.js';
import { ConfigLoader } from './config-loader.js';
import { LockManager } from './lock-manager.js';
import {
  exists,
  readJson,
  remove,
  listDir,
  isDirectory,
  isSymlink,
  createSymlink,
  getRealPath,
  ensureDir,
} from '../utils/fs.js';
import { logger } from '../utils/logger.js';

/**
 * SkillManager - 核心 Skill 管理类
 * 
 * 整合 GitResolver, CacheManager, ConfigLoader, LockManager
 * 提供完整的 skill 安装、更新、卸载功能
 */
export class SkillManager {
  private projectRoot: string;
  private resolver: GitResolver;
  private cache: CacheManager;
  private config: ConfigLoader;
  private lockManager: LockManager;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.config = new ConfigLoader(this.projectRoot);
    this.lockManager = new LockManager(this.projectRoot);
    this.cache = new CacheManager();
    
    // 使用配置中的默认 registry
    const defaults = this.config.getDefaults();
    this.resolver = new GitResolver(defaults.registry);
  }

  /**
   * 获取项目根目录
   */
  getProjectRoot(): string {
    return this.projectRoot;
  }

  /**
   * 获取安装目录
   */
  getInstallDir(): string {
    return this.config.getInstallDir();
  }

  /**
   * 获取 skill 安装路径
   */
  getSkillPath(name: string): string {
    return path.join(this.getInstallDir(), name);
  }

  /**
   * 安装 skill
   */
  async install(ref: string, options: InstallOptions = {}): Promise<InstalledSkill> {
    const { force = false, save = true } = options;

    // 解析引用
    const resolved = await this.resolver.resolve(ref);
    const { parsed, repoUrl } = resolved;
    const version = resolved.ref;
    const skillName = parsed.subPath 
      ? path.basename(parsed.subPath) 
      : parsed.repo;

    const skillPath = this.getSkillPath(skillName);

    // 检查是否已安装
    if (exists(skillPath) && !force) {
      const locked = this.lockManager.get(skillName);
      if (locked && locked.version === version) {
        logger.info(`${skillName}@${version} is already installed`);
        return this.getInstalledSkill(skillName)!;
      }
      
      if (!force) {
        logger.warn(`${skillName} is already installed. Use --force to reinstall.`);
        return this.getInstalledSkill(skillName)!;
      }
    }

    logger.package(`Installing ${skillName}@${version}...`);

    // 检查缓存
    let cacheResult = await this.cache.get(parsed, version);

    if (!cacheResult) {
      logger.debug(`Caching ${skillName}@${version} from ${repoUrl}`);
      cacheResult = await this.cache.cache(repoUrl, parsed, version, version);
    } else {
      logger.debug(`Using cached ${skillName}@${version}`);
    }

    // 复制到安装目录
    ensureDir(this.getInstallDir());
    
    if (exists(skillPath)) {
      remove(skillPath);
    }
    
    await this.cache.copyTo(parsed, version, skillPath);

    // 更新 lock 文件
    this.lockManager.lockSkill(skillName, {
      source: `${parsed.registry}:${parsed.owner}/${parsed.repo}${parsed.subPath ? '/' + parsed.subPath : ''}`,
      version,
      resolved: repoUrl,
      commit: cacheResult.commit,
    });

    // 更新 skills.json
    if (save && this.config.exists()) {
      this.config.addSkill(skillName, ref);
    }

    logger.success(`Installed ${skillName}@${version} to ${skillPath}`);

    return this.getInstalledSkill(skillName)!;
  }

  /**
   * 安装所有 skills.json 中的 skills
   */
  async installAll(options: InstallOptions = {}): Promise<InstalledSkill[]> {
    const skills = this.config.getSkills();
    const installed: InstalledSkill[] = [];

    for (const [name, ref] of Object.entries(skills)) {
      try {
        const skill = await this.install(ref, { ...options, save: false });
        installed.push(skill);
      } catch (error) {
        logger.error(`Failed to install ${name}: ${(error as Error).message}`);
      }
    }

    return installed;
  }

  /**
   * 卸载 skill
   */
  uninstall(name: string): boolean {
    const skillPath = this.getSkillPath(name);

    if (!exists(skillPath)) {
      logger.warn(`Skill ${name} is not installed`);
      return false;
    }

    // 删除安装目录
    remove(skillPath);

    // 从 lock 文件移除
    this.lockManager.remove(name);

    // 从 skills.json 移除
    if (this.config.exists()) {
      this.config.removeSkill(name);
    }

    logger.success(`Uninstalled ${name}`);
    return true;
  }

  /**
   * 更新 skill
   */
  async update(name?: string): Promise<InstalledSkill[]> {
    const updated: InstalledSkill[] = [];

    if (name) {
      // 更新单个 skill
      const ref = this.config.getSkillRef(name);
      if (!ref) {
        logger.error(`Skill ${name} not found in skills.json`);
        return [];
      }

      const skill = await this.install(ref, { force: true, save: false });
      updated.push(skill);
    } else {
      // 更新所有
      const skills = this.config.getSkills();
      for (const [skillName, ref] of Object.entries(skills)) {
        try {
          const skill = await this.install(ref, { force: true, save: false });
          updated.push(skill);
        } catch (error) {
          logger.error(`Failed to update ${skillName}: ${(error as Error).message}`);
        }
      }
    }

    return updated;
  }

  /**
   * 链接本地 skill
   */
  link(localPath: string, name?: string): InstalledSkill {
    const absolutePath = path.resolve(localPath);

    if (!exists(absolutePath)) {
      throw new Error(`Path ${localPath} does not exist`);
    }

    // 读取 skill.json 获取名称
    const skillJsonPath = path.join(absolutePath, 'skill.json');
    let skillName = name || path.basename(absolutePath);
    
    if (exists(skillJsonPath)) {
      try {
        const skillJson = readJson<SkillJson>(skillJsonPath);
        skillName = name || skillJson.name || skillName;
      } catch {
        // 忽略解析错误
      }
    }

    const linkPath = this.getSkillPath(skillName);
    
    ensureDir(this.getInstallDir());
    createSymlink(absolutePath, linkPath);

    logger.success(`Linked ${skillName} → ${absolutePath}`);

    return {
      name: skillName,
      path: linkPath,
      version: 'local',
      source: absolutePath,
      isLinked: true,
    };
  }

  /**
   * 取消链接
   */
  unlink(name: string): boolean {
    const skillPath = this.getSkillPath(name);

    if (!exists(skillPath)) {
      logger.warn(`Skill ${name} is not installed`);
      return false;
    }

    if (!isSymlink(skillPath)) {
      logger.warn(`Skill ${name} is not a linked skill`);
      return false;
    }

    remove(skillPath);
    logger.success(`Unlinked ${name}`);
    return true;
  }

  /**
   * 列出已安装的 skills
   */
  list(): InstalledSkill[] {
    const installDir = this.getInstallDir();
    
    if (!exists(installDir)) {
      return [];
    }

    const skills: InstalledSkill[] = [];
    const dirs = listDir(installDir);

    for (const name of dirs) {
      const skillPath = path.join(installDir, name);
      
      if (!isDirectory(skillPath)) {
        continue;
      }

      const skill = this.getInstalledSkill(name);
      if (skill) {
        skills.push(skill);
      }
    }

    return skills;
  }

  /**
   * 获取已安装的 skill 信息
   */
  getInstalledSkill(name: string): InstalledSkill | null {
    const skillPath = this.getSkillPath(name);

    if (!exists(skillPath)) {
      return null;
    }

    const isLinked = isSymlink(skillPath);
    const locked = this.lockManager.get(name);

    let metadata: SkillJson | undefined;
    const skillJsonPath = path.join(skillPath, 'skill.json');
    
    if (exists(skillJsonPath)) {
      try {
        metadata = readJson<SkillJson>(skillJsonPath);
      } catch {
        // 忽略解析错误
      }
    }

    return {
      name,
      path: skillPath,
      version: isLinked ? 'local' : (locked?.version || metadata?.version || 'unknown'),
      source: isLinked ? getRealPath(skillPath) : (locked?.source || ''),
      metadata,
      isLinked,
    };
  }

  /**
   * 获取 skill 详情
   */
  getInfo(name: string): {
    installed: InstalledSkill | null;
    locked: ReturnType<LockManager['get']>;
    config: string | undefined;
  } {
    return {
      installed: this.getInstalledSkill(name),
      locked: this.lockManager.get(name),
      config: this.config.getSkillRef(name),
    };
  }

  /**
   * 检查过期的 skills
   */
  async checkOutdated(): Promise<Array<{
    name: string;
    current: string;
    latest: string;
    updateAvailable: boolean;
  }>> {
    const results: Array<{
      name: string;
      current: string;
      latest: string;
      updateAvailable: boolean;
    }> = [];

    const skills = this.config.getSkills();

    for (const [name, ref] of Object.entries(skills)) {
      try {
        const locked = this.lockManager.get(name);
        const current = locked?.version || 'unknown';

        // 解析最新版本
        const parsed = this.resolver.parseRef(ref);
        const repoUrl = this.resolver.buildRepoUrl(parsed);
        
        // 强制获取 latest
        const latestResolved = await this.resolver.resolveVersion(repoUrl, {
          type: 'latest',
          value: 'latest',
          raw: 'latest',
        });

        const latest = latestResolved.ref;
        const updateAvailable = current !== latest && current !== 'unknown';

        results.push({
          name,
          current,
          latest,
          updateAvailable,
        });
      } catch (error) {
        logger.debug(`Failed to check ${name}: ${(error as Error).message}`);
        results.push({
          name,
          current: 'unknown',
          latest: 'unknown',
          updateAvailable: false,
        });
      }
    }

    return results;
  }
}

export default SkillManager;
