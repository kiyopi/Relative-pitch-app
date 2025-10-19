import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PitchPro',
      fileName: (format) => `pitchpro.${format}.js`,
      formats: ['umd']
    },
    rollupOptions: {
      external: [],  // UMDビルドには依存関係を含める
      output: {
        globals: {}
      }
    },
    sourcemap: true,
    outDir: 'dist-umd'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/core': resolve(__dirname, 'src/core'),
      '@/advanced': resolve(__dirname, 'src/advanced'),
      '@/utils': resolve(__dirname, 'src/utils')
    }
  }
})