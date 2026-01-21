import { describe, it, expect } from 'vitest';
import { updateCommand } from './update.js';

describe('update command', () => {
  it('should have correct name and alias', () => {
    expect(updateCommand.name()).toBe('update');
    expect(updateCommand.aliases()).toContain('up');
  });

  it('should accept optional skill argument', () => {
    const args = updateCommand.registeredArguments;
    expect(args).toHaveLength(1);
    expect(args[0].required).toBe(false);
  });
});

describe('update command integration', () => {
  it.skip('should update skill', async () => {
    // Requires network access
  });
});
