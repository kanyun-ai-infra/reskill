import { describe, it, expect } from 'vitest';
import { outdatedCommand } from './outdated.js';

describe('outdated command', () => {
  it('should have correct name', () => {
    expect(outdatedCommand.name()).toBe('outdated');
  });

  it('should have json option', () => {
    const jsonOption = outdatedCommand.options.find(o => o.long === '--json');
    expect(jsonOption).toBeDefined();
  });
});

describe('outdated command integration', () => {
  it.skip('should check for outdated skills', async () => {
    // Requires network access
  });
});
