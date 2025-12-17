import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@components': path.resolve(__dirname, './src/renderer/components'),
      '@pages': path.resolve(__dirname, './src/renderer/pages'),
      '@hooks': path.resolve(__dirname, './src/renderer/hooks'),
      '@stores': path.resolve(__dirname, './src/renderer/stores'),
      '@utils': path.resolve(__dirname, './src/renderer/utils')
    }
  }
})
