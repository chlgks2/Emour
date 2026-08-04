import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/users': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/couples': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/photos': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/chats': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/dashboards': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/moods': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/home': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/schedules': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/anniversaries': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/diaries': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
