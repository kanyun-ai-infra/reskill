import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'esm',
      syntax: 'es2022',
      dts: true,
    },
  ],
  source: {
    entry: {
      index: './src/index.ts',
      'cli/index': './src/cli/index.ts',
    },
  },
  output: {
    target: 'node',
    cleanDistPath: true,
    externals: [
      'chalk',
      'commander',
      'degit',
      'ora',
      'semver',
    ],
  },
});
