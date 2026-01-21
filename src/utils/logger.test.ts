import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger.js';

describe('logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    delete process.env.DEBUG;
    delete process.env.VERBOSE;
  });

  it('should log info message', () => {
    logger.info('test info');
    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls[0].join(' ');
    expect(output).toContain('test info');
  });

  it('should log success message', () => {
    logger.success('test success');
    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls[0].join(' ');
    expect(output).toContain('test success');
  });

  it('should log warning message', () => {
    logger.warn('test warning');
    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls[0].join(' ');
    expect(output).toContain('test warning');
  });

  it('should log error message to stderr', () => {
    logger.error('test error');
    expect(consoleErrorSpy).toHaveBeenCalled();
    const output = consoleErrorSpy.mock.calls[0].join(' ');
    expect(output).toContain('test error');
  });

  it('should log debug message only when DEBUG is set', () => {
    logger.debug('test debug');
    expect(consoleLogSpy).not.toHaveBeenCalled();

    process.env.DEBUG = 'true';
    logger.debug('test debug');
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('should log debug message when VERBOSE is set', () => {
    process.env.VERBOSE = 'true';
    logger.debug('test debug');
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('should log package message', () => {
    logger.package('test package');
    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls[0].join(' ');
    expect(output).toContain('test package');
  });

  it('should log plain message', () => {
    logger.log('test log');
    expect(consoleLogSpy).toHaveBeenCalledWith('test log');
  });

  it('should print newline', () => {
    logger.newline();
    expect(consoleLogSpy).toHaveBeenCalledWith();
  });

  it('should print table', () => {
    logger.table(['Name', 'Version'], [['skill1', 'v1.0.0'], ['skill2', 'v2.0.0']]);
    expect(consoleLogSpy).toHaveBeenCalledTimes(3); // header + 2 rows
  });
});
