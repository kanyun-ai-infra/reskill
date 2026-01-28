/**
 * logout command - Log out from a reskill registry
 *
 * Removes the token from ~/.reskillrc
 */

import { Command } from 'commander';
import { AuthManager } from '../../core/auth-manager.js';
import { logger } from '../../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

interface LogoutOptions {
  registry?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_REGISTRY = 'https://registry.reskill.dev';

// ============================================================================
// Main Action
// ============================================================================

async function logoutAction(options: LogoutOptions): Promise<void> {
  const registry = options.registry || process.env.RESKILL_REGISTRY || DEFAULT_REGISTRY;
  const authManager = new AuthManager();

  // Check if logged in
  const token = authManager.getToken(registry);
  if (!token) {
    logger.log(`Not logged in to ${registry}`);
    return;
  }

  const email = authManager.getEmail(registry);

  // Remove token
  authManager.removeToken(registry);

  logger.log('✓ Logged out successfully');
  if (email) {
    logger.log(`  Email: ${email}`);
  }
  logger.log(`  Registry: ${registry}`);
}

// ============================================================================
// Command Definition
// ============================================================================

export const logoutCommand = new Command('logout')
  .description('Log out from a reskill registry')
  .option('-r, --registry <url>', 'Registry URL', DEFAULT_REGISTRY)
  .action(logoutAction);

export default logoutCommand;
