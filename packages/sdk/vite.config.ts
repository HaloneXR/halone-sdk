import { defineConfig } from 'vite'

const entries = ['index', 'host', 'protocol', 'files', 'permissions', 'package']

export default defineConfig({
  build: {
    lib: {
      entry: Object.fromEntries(entries.map((name) => [name, `src/${name}.ts`])),
      formats: ['es'],
    },
    outDir: 'dist',
    target: 'es2023',
    minify: false,
    sourcemap: true,
  },
})
