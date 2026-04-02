import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: path.join(__dirname, 'electron/main.cjs'),
        formats: ['cjs'],
        fileName: () => '[name].cjs'
      },
      outDir: 'dist-electron'
    }
  },
  preload: {
    build: {
      lib: {
        entry: path.join(__dirname, 'electron/preload.cjs'),
        formats: ['cjs'],
        fileName: () => '[name].cjs'
      },
      outDir: 'dist-electron'
    }
  },
  renderer: {
    root: '.',
    plugins: [vue()],
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: path.join(__dirname, 'index.html')
      }
    }
  }
})
