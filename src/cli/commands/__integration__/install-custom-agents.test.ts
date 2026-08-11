/**
 * Integration tests for custom agent targets (issue #381)
 *
 * Custom agents let users install skills into directories that are not part of
 * the built-in agent table, either declared in skills.json under `customAgents`
 * or passed ad-hoc on the CLI as `-a alias:path`.
 *
 * Layout under test:
 *
 *   <temp>/.cc-switch/skills/<skill>       (custom agent target)
 *   <temp>/skills.json                     (declares customAgents)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createLocalGitRepo,
  createTempDir,
  getOutput,
  pathExists,
  removeTempDir,
  runCli,
} from './helpers.js';

describe('CLI Integration: install custom agents', () => {
  let tempDir: string;
  let repoUrl: string;

  beforeEach(() => {
    tempDir = createTempDir();
    repoUrl = createLocalGitRepo(tempDir, 'demo-skill');
  });

  afterEach(() => {
    removeTempDir(tempDir);
  });

  describe('customAgents declared in skills.json', () => {
    function writeCustomConfig(): void {
      const config = {
        skills: {},
        defaults: { installDir: '.skills', targetAgents: ['cc-switch'] },
        customAgents: {
          'cc-switch': { path: '.cc-switch/skills' },
        },
      };
      fs.writeFileSync(path.join(tempDir, 'skills.json'), JSON.stringify(config, null, 2));
    }

    it('should install into the custom agent directory', () => {
      writeCustomConfig();

      const { exitCode } = runCli(`install ${repoUrl}@v1.0.0 -a cc-switch -y`, tempDir);

      expect(exitCode).toBe(0);
      expect(pathExists(path.join(tempDir, '.cc-switch/skills/demo-skill'))).toBe(true);
    });

    it('should list skills installed to the custom agent', () => {
      writeCustomConfig();
      runCli(`install ${repoUrl}@v1.0.0 -a cc-switch -y`, tempDir);

      const result = runCli('list -a cc-switch', tempDir);
      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('demo-skill');
    });

    it('should uninstall from the custom agent', () => {
      writeCustomConfig();
      runCli(`install ${repoUrl}@v1.0.0 -a cc-switch -y`, tempDir);
      expect(pathExists(path.join(tempDir, '.cc-switch/skills/demo-skill'))).toBe(true);

      const result = runCli('uninstall demo-skill -y', tempDir);
      expect(result.exitCode).toBe(0);
      expect(pathExists(path.join(tempDir, '.cc-switch/skills/demo-skill'))).toBe(false);
    });
  });

  describe('CLI alias:path syntax (no config)', () => {
    it('should install into an ad-hoc custom directory', () => {
      const { exitCode } = runCli(
        `install ${repoUrl}@v1.0.0 -a cc-switch:.cc-switch/skills -y`,
        tempDir,
      );

      expect(exitCode).toBe(0);
      expect(pathExists(path.join(tempDir, '.cc-switch/skills/demo-skill'))).toBe(true);
    });

    it('should persist the alias into skills.json customAgents', () => {
      runCli(`install ${repoUrl}@v1.0.0 -a cc-switch:.cc-switch/skills -y`, tempDir);

      const config = JSON.parse(fs.readFileSync(path.join(tempDir, 'skills.json'), 'utf-8'));
      expect(config.customAgents['cc-switch']).toEqual({ path: '.cc-switch/skills' });
      expect(config.defaults.targetAgents).toContain('cc-switch');
    });

    it('should let a later reinstall reuse the persisted custom agent', () => {
      // First install persists the alias via alias:path
      runCli(`install ${repoUrl}@v1.0.0 -a cc-switch:.cc-switch/skills -y`, tempDir);
      // Remove the installed tree, then reinstall-all with no -a: must reuse config
      fs.rmSync(path.join(tempDir, '.cc-switch'), { recursive: true, force: true });

      const result = runCli('install -y', tempDir);
      expect(result.exitCode).toBe(0);
      expect(pathExists(path.join(tempDir, '.cc-switch/skills/demo-skill'))).toBe(true);
    });

    it('should reject an alias:path with an empty path', () => {
      const result = runCli(`install ${repoUrl}@v1.0.0 -a cc-switch: -y`, tempDir);
      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('missing path');
    });
  });

  describe('built-in agents unaffected', () => {
    it('should still install to a built-in agent', () => {
      const { exitCode } = runCli(`install ${repoUrl}@v1.0.0 -a claude-code -y`, tempDir);
      expect(exitCode).toBe(0);
      expect(pathExists(path.join(tempDir, '.claude/skills/demo-skill'))).toBe(true);
    });

    it('should still reject an unknown agent name', () => {
      const result = runCli(`install ${repoUrl}@v1.0.0 -a not-a-real-agent -y`, tempDir);
      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('Invalid agents');
    });
  });
});
