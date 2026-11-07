import { expect, test, type Page } from '@playwright/test'
import { fakeApi } from './api'

// la marca Quipu (appLogo de core, issue #181): en el login, en la barra lateral y, en pantalla estrecha, junto al botón
// del menú. es decorativa: el nombre de la app sigue siendo el texto accesible

const logos = (page: Page) => page.locator("[data-slot='app-logo']")

test('el login lleva la marca Quipu junto al nombre', async ({ page }) => {
  await fakeApi(page)
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
  await expect(logos(page).locator('svg')).toBeVisible()
  await expect(logos(page).first()).toHaveAttribute('aria-hidden', 'true')
})

test('la barra lateral lleva la marca Quipu', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos')
  await expect(page.getByRole('heading', { level: 1, name: 'Mis cursos' })).toBeVisible()
  await expect(page.locator("aside [data-slot='app-logo'] svg")).toBeVisible()
})

test('en pantalla estrecha la marca va junto al botón del menú', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos')
  await expect(page.getByRole('heading', { level: 1, name: 'Mis cursos' })).toBeVisible()
  await expect(page.locator("header [data-slot='app-logo'] svg")).toBeVisible()
})

test('el panel de inicio no repite el lema por defecto de Wasichai', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'authority' })
  await page.goto('/')
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByText(/geoespacial/i)).toHaveCount(0)
})
