import type { SkillsLock, LockedSkill } from '../types/index.js';
import { exists, readJson, writeJson, getSkillsLockPath } from '../utils/fs.js';

/**
 * 当前 lockfile 版本
 */
const LOCKFILE_VERSION = 1;

/**
 * LockManager - 管理 skills.lock 文件
 * 
 * 用于锁定精确版本，确保团队一致性
 */
export class LockManager {
  private projectRoot: string;
  private lockPath: string;
  private lockData: SkillsLock | null = null;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.lockPath = getSkillsLockPath(this.projectRoot);
  }

  /**
   * 获取 lock 文件路径
   */
  getLockPath(): string {
    return this.lockPath;
  }

  /**
   * 检查 lock 文件是否存在
   */
  exists(): boolean {
    return exists(this.lockPath);
  }

  /**
   * 加载 lock 文件
   */
  load(): SkillsLock {
    if (this.lockData) {
      return this.lockData;
    }

    if (!this.exists()) {
      // 如果不存在，创建空的 lock
      this.lockData = {
        lockfileVersion: LOCKFILE_VERSION,
        skills: {},
      };
      return this.lockData;
    }

    try {
      this.lockData = readJson<SkillsLock>(this.lockPath);
      return this.lockData;
    } catch (error) {
      throw new Error(`Failed to parse skills.lock: ${(error as Error).message}`);
    }
  }

  /**
   * 重新加载 lock 文件
   */
  reload(): SkillsLock {
    this.lockData = null;
    return this.load();
  }

  /**
   * 保存 lock 文件
   */
  save(lockToSave?: SkillsLock): void {
    const toSave = lockToSave || this.lockData;
    if (!toSave) {
      throw new Error('No lock to save');
    }
    writeJson(this.lockPath, toSave);
    this.lockData = toSave;
  }

  /**
   * 获取锁定的 skill
   */
  get(name: string): LockedSkill | undefined {
    const lock = this.load();
    return lock.skills[name];
  }

  /**
   * 设置锁定的 skill
   */
  set(name: string, skill: LockedSkill): void {
    const lock = this.load();
    lock.skills[name] = skill;
    this.save();
  }

  /**
   * 移除锁定的 skill
   */
  remove(name: string): boolean {
    const lock = this.load();
    if (lock.skills[name]) {
      delete lock.skills[name];
      this.save();
      return true;
    }
    return false;
  }

  /**
   * 锁定 skill
   */
  lockSkill(
    name: string,
    options: {
      source: string;
      version: string;
      resolved: string;
      commit: string;
    }
  ): LockedSkill {
    const lockedSkill: LockedSkill = {
      source: options.source,
      version: options.version,
      resolved: options.resolved,
      commit: options.commit,
      installedAt: new Date().toISOString(),
    };

    this.set(name, lockedSkill);
    return lockedSkill;
  }

  /**
   * 获取所有锁定的 skills
   */
  getAll(): Record<string, LockedSkill> {
    const lock = this.load();
    return { ...lock.skills };
  }

  /**
   * 检查 skill 是否已锁定
   */
  has(name: string): boolean {
    const lock = this.load();
    return name in lock.skills;
  }

  /**
   * 检查锁定的版本是否与当前一致
   */
  isVersionMatch(name: string, version: string): boolean {
    const locked = this.get(name);
    if (!locked) {
      return false;
    }
    return locked.version === version;
  }

  /**
   * 清空所有锁定
   */
  clear(): void {
    this.lockData = {
      lockfileVersion: LOCKFILE_VERSION,
      skills: {},
    };
    this.save();
  }

  /**
   * 删除 lock 文件
   */
  delete(): void {
    if (this.exists()) {
      const fs = require('node:fs');
      fs.unlinkSync(this.lockPath);
    }
    this.lockData = null;
  }
}

export default LockManager;
