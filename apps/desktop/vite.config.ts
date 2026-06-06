import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isWebBuild = mode === 'web' || process.env.BUILD_WEB === 'true'

  return {
    base: '/', // For GitHub Pages
    plugins: [
      tailwindcss(),
      react(),
      // Only include Electron plugin when not building for web/GitHub Pages
      ...(isWebBuild
        ? []
        : [
            electron({
              main: {
                entry: 'electron/main.ts',
                vite: {
                  build: {
                    rollupOptions: {
                      external: ['@computer-use/nut-js', 'electron-updater'],
                    },
                  },
                },
              },
              preload: {
                input: path.join(__dirname, 'electron/preload.ts'),
              },
            }),
          ]),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared/types': path.resolve(__dirname, '../../packages/shared-types/index.ts'),
      },
    },
  }
})
