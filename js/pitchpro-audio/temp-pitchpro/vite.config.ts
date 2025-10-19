import { defineConfig } from 'vite'
import { resolve } from 'path'

// ビルド出力設定の定数化
const OUTPUT_FORMATS = {
  ESM: { format: 'es', fileName: 'index.esm.js' },
  CJS: { format: 'cjs', fileName: 'index.js' },
  UMD: { format: 'umd', fileName: 'pitchpro.umd.js' }
} as const

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PitchPro',
      fileName: (format) => {
        switch (format) {
          case 'umd':
            return OUTPUT_FORMATS.UMD.fileName
          case 'es':
            return OUTPUT_FORMATS.ESM.fileName
          case 'cjs':
          default:
            return OUTPUT_FORMATS.CJS.fileName
        }
      },
      formats: ['es', 'cjs', 'umd']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    },
    sourcemap: true,
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/core': resolve(__dirname, 'src/core'),
      '@/advanced': resolve(__dirname, 'src/advanced'),
      '@/utils': resolve(__dirname, 'src/utils')
    }
  },
  css: {
    postcss: {}
  }
})