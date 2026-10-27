import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// puerto fijo: el backend y la documentación de operación cuentan con 5180 (docs/operations del backend)
const PORT = 5180

export default defineConfig(({ mode }) => {
  // WASICHAI_API_URL sale del entorno o de .env; sin prefijo VITE_, así nunca llega al bundle
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = { '/api': env.WASICHAI_API_URL ?? 'http://localhost:8090' }
  return {
    plugins: [react(), tailwindcss()],
    server: { port: PORT, strictPort: true, proxy },
    preview: { port: PORT, strictPort: true, proxy },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      include: ['src/**/*.test.{ts,tsx}']
    }
  }
})
