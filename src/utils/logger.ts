import chalk from 'chalk';

/**
 * Logger utility for CLI output
 */
export const logger = {
  /**
   * Info message (blue)
   */
  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  },

  /**
   * Success message (green)
   */
  success(message: string): void {
    console.log(chalk.green('✅'), message);
  },

  /**
   * Warning message (yellow)
   */
  warn(message: string): void {
    console.log(chalk.yellow('⚠️'), message);
  },

  /**
   * Error message (red)
   */
  error(message: string): void {
    console.error(chalk.red('❌'), message);
  },

  /**
   * Debug message (gray, only in verbose mode)
   */
  debug(message: string): void {
    if (process.env.DEBUG || process.env.VERBOSE) {
      console.log(chalk.gray('🔍'), chalk.gray(message));
    }
  },

  /**
   * Package/skill message (package emoji)
   */
  package(message: string): void {
    console.log(chalk.cyan('📦'), message);
  },

  /**
   * Plain message without icon
   */
  log(message: string): void {
    console.log(message);
  },

  /**
   * Newline
   */
  newline(): void {
    console.log();
  },

  /**
   * Table-like output
   */
  table(headers: string[], rows: string[][]): void {
    // Calculate column widths
    const widths = headers.map((h, i) => {
      const colValues = [h, ...rows.map(r => r[i] || '')];
      return Math.max(...colValues.map(v => v.length));
    });

    // Print header
    const headerRow = headers.map((h, i) => h.padEnd(widths[i])).join('  ');
    console.log(chalk.bold(headerRow));

    // Print separator (removed)
    // console.log(widths.map(w => '-'.repeat(w)).join('  '));

    // Print rows
    for (const row of rows) {
      const rowStr = row.map((cell, i) => (cell || '').padEnd(widths[i])).join('  ');
      console.log(rowStr);
    }
  },
};

export default logger;
