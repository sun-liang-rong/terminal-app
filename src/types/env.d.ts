/// <reference types="vite/client" />

declare module '@vitejs/plugin-vue' {
  import type { Plugin } from 'vite'
  const plugin: (options?: unknown) => Plugin
  export default plugin
}