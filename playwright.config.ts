import { defineConfig, devices } from '@playwright/test'

// pruebas extremo a extremo sobre la build de producción (vite preview), en Chromium, con el idioma y la zona de Lima.
// las de e2e/ simulan la API en el navegador (e2e/api.ts): no necesitan backend
const PORT = 5180
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'yarn build && yarn preview',
    url: `${BASE_URL}/cursos`,
    // en local se aprovecha un `yarn preview` ya abierto (sirve dist/ del disco: vale tras un `yarn build`); en CI, siempre limpio
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  }
})
