import { fileURLToPath } from "url"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Check process.env first (Docker), then .env files, then default
  const target = process.env.BACKEND_URL || env.BACKEND_URL || 'http://localhost:8000'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: true, // Listen on all addresses
      port: 5173,
      proxy: {
        '/api': {
          target: target,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})
