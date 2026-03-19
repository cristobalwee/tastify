import { defineConfig } from 'tsup';
import { copyFileSync } from 'node:fs';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  external: ['react', 'react-dom'],
  onSuccess: async () => {
    copyFileSync('src/styles/tastify.css', 'dist/styles.css');
  },
});
