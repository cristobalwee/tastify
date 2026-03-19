import { defineConfig } from 'tsup';
import { copyFileSync } from 'node:fs';

export default defineConfig([
  // ESM + CJS builds (core is external)
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    splitting: false,
    external: ['@tastify/core'],
    onSuccess: async () => {
      copyFileSync('src/styles/tastify.css', 'dist/styles.css');
    },
  },
  // IIFE build (core is bundled, includes auto-init)
  {
    entry: { tastify: 'src/iife.ts' },
    format: ['iife'],
    globalName: 'Tastify',
    clean: false,
    splitting: false,
    minify: true,
    treeshake: true,
    outExtension: () => ({ js: '.iife.js' }),
  },
]);
