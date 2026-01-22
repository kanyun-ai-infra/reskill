/**
 * Update Notifier - Check for CLI updates from npm registry
 *
 * Provides non-blocking update notifications to users when a newer version is available.
 */

import semver from 'semver';
import { logger } from './logger.js';

/**
 * Update check result
 */
export interface UpdateCheckResult {
  /** Current installed version */
  current: string;
  /** Latest version on npm */
  latest: string;
  /** Whether an update is available */
  hasUpdate: boolean;
}

/**
 * Options for update check
 */
export interface CheckOptions {
  /** Timeout in milliseconds (default: 3000) */
  timeout?: number;
}

/**
 * Check for updates from npm registry
 *
 * @param packageName - Name of the package to check
 * @param currentVersion - Current installed version
 * @param options - Check options
 * @returns Update check result, or null if check failed
 */
export async function checkForUpdate(
  packageName: string,
  currentVersion: string,
  options: CheckOptions = {},
): Promise<UpdateCheckResult | null> {
  const timeout = options.timeout ?? 3000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`https://registry.npmjs.org/${packageName}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { 'dist-tags': { latest: string } };
    const latest = data['dist-tags']?.latest;

    if (!latest) {
      return null;
    }

    const hasUpdate = semver.gt(latest, currentVersion);

    return {
      current: currentVersion,
      latest,
      hasUpdate,
    };
  } catch {
    // Silently fail - don't interrupt user workflow
    return null;
  }
}

/**
 * Format update message for display
 *
 * @param result - Update check result
 * @returns Formatted message string, or empty string if no update
 */
export function formatUpdateMessage(result: UpdateCheckResult): string {
  if (!result.hasUpdate) {
    return '';
  }

  return `
┌────────────────────────────────────────────────────┐
│                                                    │
│   Update available: ${result.current} → ${result.latest.padEnd(10)}          │
│   Run: npm install -g reskill@latest               │
│                                                    │
└────────────────────────────────────────────────────┘
`;
}

/**
 * Check for updates and notify user if available
 *
 * This function is designed to be non-blocking and silent on errors.
 *
 * @param packageName - Name of the package to check
 * @param currentVersion - Current installed version
 */
export async function notifyUpdate(packageName: string, currentVersion: string): Promise<void> {
  try {
    const result = await checkForUpdate(packageName, currentVersion);

    if (result?.hasUpdate) {
      const message = formatUpdateMessage(result);
      logger.log(message);
    }
  } catch {
    // Silently fail - don't interrupt user workflow
  }
}
