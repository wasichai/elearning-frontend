import { defineConfig, devices } from '@playwright/test'

// el recorrido visual, aparte de `yarn e2e`: las capturas dependen del sistema. arranca su propio `yarn dev` y falla si el
// puerto está ocupado: reutilizar lo que escuche ahí fotografiaría otra aplicación. VISUAL_REUSE=1 reutiliza el tuyo a sabiendas
const PORT = Number(process.env.VISUAL_PORT ?? 5180)

export default defineConfig({
  testDir: 'e2e/visual',
  fullyParallel: true,
  reporter: 'line',
  outputDir: process.env.VISUAL_OUTPUT ?? 'test-results/visual',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: process.env.VISUAL_LOCALE ?? 'es-PE',
    timezoneId: 'America/Lima',
    colorScheme: process.env.VISUAL_DARK ? 'dark' : 'light'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `yarn dev --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/cursos`,
    reuseExistingServer: Boolean(process.env.VISUAL_REUSE),
    timeout: 60_000
  }
})
