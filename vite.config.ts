/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Read PORT from .env (server-side only; it is not sent to the browser).
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = env.PORT || '3001'

  return {
    plugins: [react()],
    server: {
      // The React app calls /api/...; Vite forwards those requests to the Express API (npm run server).
      proxy: { '/api': `http://127.0.0.1:${apiPort}` },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
    },
  }
})
