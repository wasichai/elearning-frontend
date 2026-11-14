import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { brandHtml } from './src/brandHtml'

// puerto fijo: el backend y la documentación de operación cuentan con 5180 (docs/operations del backend)
const PORT = 5180

export default defineConfig(({ mode }) => {
  // WASICHAI_API_URL sale del entorno o de .env; sin prefijo VITE_, así nunca llega al bundle
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = { '/api': env.WASICHAI_API_URL ?? 'http://localhost:8090' }
  return {
    // el nombre y el logo del despliegue también en el index.html: título e icono de la pestaña
    plugins: [react(), tailwindcss(), { name: 'brand-html', transformIndexHtml: (html: string) => brandHtml(html, env) }],
    server: { port: PORT, strictPort: true, proxy },
    preview: { port: PORT, strictPort: true, proxy },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      include: ['src/**/*.test.{ts,tsx}'],
      // los recorridos de un formulario con userEvent (un intento, la corrección) pasan de 5 s en una máquina cargada
      testTimeout: 15_000
    }
  }
})
