import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/gk-api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/addition-api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/quadratic-api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/sqrt-api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/multiply-api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
    },
  },
})
