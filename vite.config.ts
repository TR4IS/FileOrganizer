import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

const isTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test'

export default defineConfig({
  plugins: isTest
    ? []
    : [
        react(),
        electron([
          {
            entry: 'electron/main.ts',
            onstart(options) {
              options.startup()
            },
            vite: {
              build: {
                outDir: 'dist-electron',
                sourcemap: true,
              },
            },
          },
          {
            entry: 'electron/preload.ts',
            onstart(options) {
              options.reload()
            },
            vite: {
              build: {
                outDir: 'dist-electron',
                sourcemap: true,
              },
            },
          },
        ]),
        renderer(),
      ],
  build: {
    outDir: 'dist',
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '2.0.0'),
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
