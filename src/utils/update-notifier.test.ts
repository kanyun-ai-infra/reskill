import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fetch before importing module
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock logger
vi.mock('./logger.ts', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('update-notifier', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkForUpdate', () => {
    it('should return latest version from npm registry', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 'dist-tags': { latest: '1.0.0' } }),
      });

      const { checkForUpdate } = await import('./update-notifier.ts');
      const result = await checkForUpdate('test-package', '0.9.0');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/test-package',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(result).toEqual({
        current: '0.9.0',
        latest: '1.0.0',
        hasUpdate: true,
      });
    });

    it('should return hasUpdate=false when current is latest', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 'dist-tags': { latest: '1.0.0' } }),
      });

      const { checkForUpdate } = await import('./update-notifier.ts');
      const result = await checkForUpdate('test-package', '1.0.0');

      expect(result).toEqual({
        current: '1.0.0',
        latest: '1.0.0',
        hasUpdate: false,
      });
    });

    it('should return hasUpdate=false when current is newer than latest', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 'dist-tags': { latest: '1.0.0' } }),
      });

      const { checkForUpdate } = await import('./update-notifier.ts');
      const result = await checkForUpdate('test-package', '2.0.0');

      expect(result).toEqual({
        current: '2.0.0',
        latest: '1.0.0',
        hasUpdate: false,
      });
    });

    it('should return null when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { checkForUpdate } = await import('./update-notifier.ts');
      const result = await checkForUpdate('test-package', '1.0.0');

      expect(result).toBeNull();
    });

    it('should return null when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { checkForUpdate } = await import('./update-notifier.ts');
      const result = await checkForUpdate('test-package', '1.0.0');

      expect(result).toBeNull();
    });

    it('should timeout after specified duration', async () => {
      mockFetch.mockImplementationOnce(
        (_url: string, options: { signal: AbortSignal }) =>
          new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, 10000);
            options.signal.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      );

      const { checkForUpdate } = await import('./update-notifier.ts');
      const result = await checkForUpdate('test-package', '1.0.0', { timeout: 100 });

      expect(result).toBeNull();
    });
  });

  describe('formatUpdateMessage', () => {
    it('should format update message correctly', async () => {
      const { formatUpdateMessage } = await import('./update-notifier.ts');
      const message = formatUpdateMessage({
        current: '0.9.0',
        latest: '1.0.0',
        hasUpdate: true,
      });

      expect(message).toContain('0.9.0');
      expect(message).toContain('1.0.0');
      expect(message).toContain('npm');
    });

    it('should return empty string when no update available', async () => {
      const { formatUpdateMessage } = await import('./update-notifier.ts');
      const message = formatUpdateMessage({
        current: '1.0.0',
        latest: '1.0.0',
        hasUpdate: false,
      });

      expect(message).toBe('');
    });
  });

  describe('notifyUpdate', () => {
    it('should log update message when update is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 'dist-tags': { latest: '1.0.0' } }),
      });

      const { logger } = await import('./logger.ts');
      const { notifyUpdate } = await import('./update-notifier.ts');

      await notifyUpdate('test-package', '0.9.0');

      expect(logger.log).toHaveBeenCalled();
    });

    it('should not log when no update available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 'dist-tags': { latest: '1.0.0' } }),
      });

      const { logger } = await import('./logger.ts');
      const { notifyUpdate } = await import('./update-notifier.ts');

      await notifyUpdate('test-package', '1.0.0');

      expect(logger.log).not.toHaveBeenCalled();
    });

    it('should not throw when check fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { notifyUpdate } = await import('./update-notifier.ts');

      // Should not throw
      await expect(notifyUpdate('test-package', '1.0.0')).resolves.toBeUndefined();
    });
  });
});
