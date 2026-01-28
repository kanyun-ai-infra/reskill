/**
 * CLI Integration Tests: publish command
 *
 * Tests for the publish command --dry-run validation
 * (API calls are not tested here, only local validation)
 *
 * Following agentskills.io specification:
 * - SKILL.md is REQUIRED with name and description in frontmatter
 * - skill.json is OPTIONAL for additional metadata
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createTempDir,
  getOutput,
  removeTempDir,
  runCli,
} from './helpers.js';

describe('CLI Integration: publish', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    removeTempDir(tempDir);
  });

  // Helper functions
  function createSkillJson(content: object): void {
    fs.writeFileSync(
      path.join(tempDir, 'skill.json'),
      JSON.stringify(content, null, 2),
    );
  }

  function createSkillMd(content: string): void {
    fs.writeFileSync(path.join(tempDir, 'SKILL.md'), content);
  }

  /** Create a valid SKILL.md with required frontmatter */
  function createValidSkillMd(
    name = 'my-skill',
    description = 'A helpful AI skill',
  ): void {
    createSkillMd(`---
name: ${name}
description: ${description}
---
# ${name}

This is the skill content.`);
  }

  function initGitRepo(): void {
    execSync('git init', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
  }

  function gitCommit(message = 'test commit'): string {
    execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
    execSync(`git commit -m "${message}"`, { cwd: tempDir, stdio: 'pipe' });
    return execSync('git rev-parse HEAD', { cwd: tempDir, encoding: 'utf-8' }).trim();
  }

  function gitTag(tag: string): void {
    execSync(`git tag ${tag}`, { cwd: tempDir, stdio: 'pipe' });
  }

  function setRemote(url: string): void {
    execSync(`git remote add origin ${url}`, { cwd: tempDir, stdio: 'pipe' });
  }

  // ============================================================================
  // --help tests
  // ============================================================================

  describe('--help', () => {
    it('should show help message', () => {
      const { stdout, exitCode } = runCli('publish --help', tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Publish a skill to the registry');
      expect(stdout).toContain('--dry-run');
      expect(stdout).toContain('--registry');
      expect(stdout).toContain('--tag');
      expect(stdout).toContain('--yes');
    });

    it('should show alias pub', () => {
      const { stdout, exitCode } = runCli('pub --help', tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Publish a skill to the registry');
    });
  });

  // ============================================================================
  // --dry-run validation: SKILL.md (required per agentskills.io spec)
  // ============================================================================

  describe('--dry-run: SKILL.md validation (required)', () => {
    it('should fail without SKILL.md', () => {
      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('SKILL.md');
      expect(getOutput(result)).toContain('not found');
    });

    it('should fail when SKILL.md has no frontmatter', () => {
      createSkillMd('# My Skill\n\nNo frontmatter here.');

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('frontmatter');
    });

    it('should fail without name in SKILL.md', () => {
      createSkillMd(`---
description: Test skill
---
# Content`);

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('SKILL.md');
    });

    it('should fail without description in SKILL.md', () => {
      createSkillMd(`---
name: my-skill
---
# Content`);

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('SKILL.md');
    });

    it('should fail with uppercase name in SKILL.md', () => {
      createSkillMd(`---
name: MySkill
description: Test skill
---
# Content`);

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('lowercase');
    });

    it('should fail with name starting with hyphen', () => {
      createSkillMd(`---
name: -my-skill
description: Test skill
---
# Content`);

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
    });

    it('should pass with valid SKILL.md only (no skill.json)', () => {
      createValidSkillMd();

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('Dry run');
      expect(getOutput(result)).toContain('my-skill');
      expect(getOutput(result)).toContain('No changes made');
    });

    it('should show warning about missing skill.json', () => {
      createValidSkillMd();

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('skill.json');
      expect(getOutput(result)).toContain('optional');
    });
  });

  // ============================================================================
  // --dry-run validation: skill.json (optional)
  // ============================================================================

  describe('--dry-run: skill.json validation (optional)', () => {
    it('should fail with invalid JSON in skill.json', () => {
      createValidSkillMd();
      fs.writeFileSync(path.join(tempDir, 'skill.json'), '{ invalid json }');

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('skill.json');
    });

    it('should fail with invalid version in skill.json', () => {
      createValidSkillMd();
      createSkillJson({
        name: 'my-skill',
        version: '1.0', // Invalid semver
        description: 'Test skill',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('semver');
    });

    it('should fail when names mismatch between SKILL.md and skill.json', () => {
      createValidSkillMd('my-skill');
      createSkillJson({
        name: 'different-skill',
        version: '1.0.0',
        description: 'Test skill',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('mismatch');
    });

    it('should pass with valid SKILL.md and skill.json', () => {
      createValidSkillMd();
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'A helpful AI skill',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('Dry run');
      expect(getOutput(result)).toContain('my-skill');
      expect(getOutput(result)).toContain('1.0.0');
      expect(getOutput(result)).toContain('No changes made');
    });
  });

  // ============================================================================
  // --dry-run validation: SKILL.md with skill.json
  // ============================================================================

  describe('--dry-run: SKILL.md with skill.json', () => {
    it('should pass with valid SKILL.md and skill.json', () => {
      createValidSkillMd();
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('SKILL.md found');
      expect(getOutput(result)).toContain('skill.json found');
    });

    it('should use version from skill.json', () => {
      createValidSkillMd();
      createSkillJson({
        name: 'my-skill',
        version: '2.5.0',
        description: 'Test skill',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('2.5.0');
    });
  });

  // ============================================================================
  // --dry-run validation: Git information
  // ============================================================================

  describe('--dry-run: Git information', () => {
    it('should show commit information', () => {
      createValidSkillMd();
      initGitRepo();
      gitCommit();

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('Commit');
    });

    it('should show tag information', () => {
      createValidSkillMd();
      initGitRepo();
      gitCommit();
      gitTag('v1.0.0');

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('v1.0.0');
    });

    it('should show repository URL', () => {
      createValidSkillMd();
      initGitRepo();
      gitCommit();
      setRemote('https://github.com/user/my-skill.git');

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('github.com');
    });

    it('should warn about dirty working tree', () => {
      createValidSkillMd();
      initGitRepo();
      gitCommit();

      // Create uncommitted file
      fs.writeFileSync(path.join(tempDir, 'uncommitted.txt'), 'uncommitted content');

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('uncommitted');
    });

    it('should use specified tag with --tag', () => {
      createValidSkillMd();
      initGitRepo();
      gitCommit();
      gitTag('v1.0.0');

      // Add another commit
      fs.writeFileSync(path.join(tempDir, 'new-file.txt'), 'new content');
      gitCommit('second commit');
      gitTag('v2.0.0');

      const result = runCli('publish --dry-run --tag v1.0.0', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('v1.0.0');
    });

    it('should fail with non-existent tag', () => {
      createValidSkillMd();
      initGitRepo();
      gitCommit();

      const result = runCli('publish --dry-run --tag v999.0.0', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('not found');
    });

    it('should work without git repository', () => {
      createValidSkillMd();

      const result = runCli('publish --dry-run', tempDir);

      // Should pass but without git info
      expect(result.exitCode).toBe(0);
    });
  });

  // ============================================================================
  // --dry-run: Files listing
  // ============================================================================

  describe('--dry-run: Files listing', () => {
    it('should list files to publish', () => {
      createValidSkillMd();
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('skill.json');
      expect(getOutput(result)).toContain('SKILL.md');
    });

    it('should include files from files array', () => {
      createValidSkillMd();
      fs.mkdirSync(path.join(tempDir, 'examples'));
      fs.writeFileSync(path.join(tempDir, 'examples', 'basic.md'), '# Basic Example');

      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
        files: ['examples/'],
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('examples');
    });

    it('should show total file count and size', () => {
      createValidSkillMd();

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toMatch(/\d+ files?/);
    });
  });

  // ============================================================================
  // --dry-run: Integrity hash
  // ============================================================================

  describe('--dry-run: Integrity hash', () => {
    it('should display integrity hash', () => {
      createValidSkillMd();

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toMatch(/sha256-[a-f0-9]{64}/);
    });
  });

  // ============================================================================
  // --dry-run: Metadata display
  // ============================================================================

  describe('--dry-run: Metadata display', () => {
    it('should display keywords from skill.json', () => {
      createValidSkillMd();
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
        keywords: ['typescript', 'testing', 'ai'],
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('typescript');
      expect(getOutput(result)).toContain('testing');
    });

    it('should display license from SKILL.md', () => {
      createSkillMd(`---
name: my-skill
description: Test skill
license: MIT
---
# Content`);

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('MIT');
    });

    it('should display license from skill.json', () => {
      createValidSkillMd();
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
        license: 'Apache-2.0',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('Apache-2.0');
    });

    it('should display compatibility from skill.json', () => {
      createValidSkillMd();
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
        compatibility: {
          cursor: '>=0.40',
          claude: '>=3.5',
        },
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('cursor');
      expect(getOutput(result)).toContain('>=0.40');
    });
  });

  // ============================================================================
  // Authentication check (without --dry-run)
  // ============================================================================

  describe('authentication check', () => {
    it('should fail without token when not using --dry-run', () => {
      createValidSkillMd();

      const result = runCli('publish --yes', tempDir);

      expect(result.exitCode).not.toBe(0);
      expect(getOutput(result)).toContain('login');
    });

    it('should not require auth for --dry-run', () => {
      createValidSkillMd();

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      // Should not mention login
    });
  });

  // ============================================================================
  // Path argument
  // ============================================================================

  describe('path argument', () => {
    it('should publish from specified directory', () => {
      const subDir = path.join(tempDir, 'subdir');
      fs.mkdirSync(subDir);
      fs.writeFileSync(
        path.join(subDir, 'SKILL.md'),
        `---
name: sub-skill
description: A skill in subdirectory
---
# Sub Skill`,
      );

      const result = runCli(`publish ${subDir} --dry-run`, tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('sub-skill');
    });

    it('should fail with non-existent directory', () => {
      const result = runCli('publish /nonexistent/path --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
    });
  });

  // ============================================================================
  // Custom entry file
  // ============================================================================

  describe('custom entry file', () => {
    it('should fail when custom entry file does not exist', () => {
      createValidSkillMd();
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
        entry: 'CUSTOM.md',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('entry');
      expect(getOutput(result)).toContain('CUSTOM.md');
    });

    it('should pass when custom entry file exists', () => {
      createValidSkillMd();
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
        entry: 'CUSTOM.md',
      });
      fs.writeFileSync(path.join(tempDir, 'CUSTOM.md'), '# Custom Entry');

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
    });
  });
});
