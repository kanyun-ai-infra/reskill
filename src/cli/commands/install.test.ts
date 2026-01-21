import { describe, it, expect, vi } from 'vitest';
import { installCommand } from './install.js';

describe('install command', () => {
  it('should have correct name and alias', () => {
    expect(installCommand.name()).toBe('install');
    expect(installCommand.aliases()).toContain('i');
  });

  it('should have force option', () => {
    const forceOption = installCommand.options.find(o => o.long === '--force');
    expect(forceOption).toBeDefined();
  });

  it('should have no-save option', () => {
    const noSaveOption = installCommand.options.find(o => o.long === '--no-save');
    expect(noSaveOption).toBeDefined();
  });
});

// Integration tests would require mocking the SkillManager
describe('install command integration', () => {
  it.skip('should install skill from github', async () => {
    // Requires network access
  });
});
