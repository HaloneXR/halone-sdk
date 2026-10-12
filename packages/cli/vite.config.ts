import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    ssr: 'src/cli.ts',
    outDir: 'dist',
    target: 'node22',
    rollupOptions: {
      external: ['vite'],
      output: { banner: '#!/usr/bin/env node', entryFileNames: 'cli.js' },
    },
  },
  ssr: { noExternal: ['@halone/sdk'] },
})
