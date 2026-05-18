import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    platform: 'node',
    target: 'node20',
    external: ['better-sqlite3', 'pg'],
  },
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    clean: false,
    platform: 'node',
    target: 'node20',
    external: ['better-sqlite3', 'pg'],
  },
]);
