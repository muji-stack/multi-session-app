import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['electron'] })],
    build: {
      rollupOptions: {
        external: ['electron', 'better-sqlite3']
      }
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['electron'] })],
    build: {
      rollupOptions: {
        external: ['electron']
      }
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer'),
        '@components': resolve('src/renderer/components'),
        '@hooks': resolve('src/renderer/hooks'),
        '@stores': resolve('src/renderer/stores'),
        '@pages': resolve('src/renderer/pages'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()]
  }
})
