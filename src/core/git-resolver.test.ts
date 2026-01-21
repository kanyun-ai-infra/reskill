import { describe, it, expect } from 'vitest';
import { GitResolver } from './git-resolver.js';

describe('GitResolver', () => {
  const resolver = new GitResolver('github');

  describe('parseRef', () => {
    it('should parse simple owner/repo', () => {
      const result = resolver.parseRef('user/skill');
      expect(result).toEqual({
        registry: 'github',
        owner: 'user',
        repo: 'skill',
        subPath: undefined,
        version: undefined,
        raw: 'user/skill',
      });
    });

    it('should parse owner/repo with version', () => {
      const result = resolver.parseRef('user/skill@v1.0.0');
      expect(result).toEqual({
        registry: 'github',
        owner: 'user',
        repo: 'skill',
        subPath: undefined,
        version: 'v1.0.0',
        raw: 'user/skill@v1.0.0',
      });
    });

    it('should parse with registry prefix', () => {
      const result = resolver.parseRef('gitlab:group/skill@latest');
      expect(result).toEqual({
        registry: 'gitlab',
        owner: 'group',
        repo: 'skill',
        subPath: undefined,
        version: 'latest',
        raw: 'gitlab:group/skill@latest',
      });
    });

    it('should parse with custom registry', () => {
      const result = resolver.parseRef('gitlab.company.com:team/skill@v2.0.0');
      expect(result).toEqual({
        registry: 'gitlab.company.com',
        owner: 'team',
        repo: 'skill',
        subPath: undefined,
        version: 'v2.0.0',
        raw: 'gitlab.company.com:team/skill@v2.0.0',
      });
    });

    it('should parse with subPath (monorepo)', () => {
      const result = resolver.parseRef('github:org/monorepo/skills/pdf@v1.0.0');
      expect(result).toEqual({
        registry: 'github',
        owner: 'org',
        repo: 'monorepo',
        subPath: 'skills/pdf',
        version: 'v1.0.0',
        raw: 'github:org/monorepo/skills/pdf@v1.0.0',
      });
    });

    it('should throw for invalid ref', () => {
      expect(() => resolver.parseRef('invalid')).toThrow('Invalid skill reference');
    });
  });

  describe('parseVersion', () => {
    it('should parse exact version', () => {
      expect(resolver.parseVersion('v1.0.0')).toEqual({
        type: 'exact',
        value: 'v1.0.0',
        raw: 'v1.0.0',
      });
    });

    it('should parse latest', () => {
      expect(resolver.parseVersion('latest')).toEqual({
        type: 'latest',
        value: 'latest',
        raw: 'latest',
      });
    });

    it('should parse semver range with ^', () => {
      expect(resolver.parseVersion('^2.0.0')).toEqual({
        type: 'range',
        value: '^2.0.0',
        raw: '^2.0.0',
      });
    });

    it('should parse semver range with ~', () => {
      expect(resolver.parseVersion('~1.2.3')).toEqual({
        type: 'range',
        value: '~1.2.3',
        raw: '~1.2.3',
      });
    });

    it('should parse branch', () => {
      expect(resolver.parseVersion('branch:develop')).toEqual({
        type: 'branch',
        value: 'develop',
        raw: 'branch:develop',
      });
    });

    it('should parse commit', () => {
      expect(resolver.parseVersion('commit:abc1234')).toEqual({
        type: 'commit',
        value: 'abc1234',
        raw: 'commit:abc1234',
      });
    });

    it('should default to branch:main for undefined', () => {
      expect(resolver.parseVersion(undefined)).toEqual({
        type: 'branch',
        value: 'main',
        raw: '',
      });
    });
  });

  describe('buildRepoUrl', () => {
    it('should build github URL', () => {
      const parsed = resolver.parseRef('user/repo');
      expect(resolver.buildRepoUrl(parsed)).toBe('https://github.com/user/repo');
    });

    it('should build gitlab URL', () => {
      const parsed = resolver.parseRef('gitlab:group/repo');
      expect(resolver.buildRepoUrl(parsed)).toBe('https://gitlab.com/group/repo');
    });

    it('should build custom registry URL', () => {
      const parsed = resolver.parseRef('gitlab.company.com:team/repo');
      expect(resolver.buildRepoUrl(parsed)).toBe('https://gitlab.company.com/team/repo');
    });
  });
});

// Integration tests (require network)
describe('GitResolver integration', () => {
  it.skip('should resolve latest version from real repo', async () => {
    const resolver = new GitResolver();
    const result = await resolver.resolve('OthmanAdi/planning-with-files@latest');
    expect(result.ref).toBeDefined();
  });
});
