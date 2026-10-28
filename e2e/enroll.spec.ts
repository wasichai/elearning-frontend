import { expect, test, type Page } from '@playwright/test'
import { fakeApi } from './api'

// matricularse desde la ficha pública: sin sesión lleva al inicio de sesión; con sesión matricula y abre el aula

const SLUG = 'srtm-anuncios'
const ACTION = /^Matricularme en la edición 9 nov\s–\s4 dic 2026$/
const offerings = (page: Page) => page.getByRole('heading', { level: 2, name: 'Ediciones' }).locator('..')

test('sin sesión, «Inicia sesión para matricularte» lleva al inicio de sesión de Wasichai', async ({ page }) => {
  const api = await fakeApi(page)
  await page.goto(`/cursos/${SLUG}`)

  await expect(offerings(page).getByRole('button', { name: ACTION })).toHaveCount(0)
  await offerings(page).getByRole('link', { name: 'Inicia sesión para matricularte' }).click()
  await expect(page).toHaveURL('/login')
  expect(api.enrollRequests).toEqual([])
})

test('con sesión, «Matricularme» matricula y abre el aula de la matrícula', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, enrolled: false })
  await page.goto(`/cursos/${SLUG}`)

  await offerings(page).getByRole('button', { name: ACTION }).click()

  await expect(page).toHaveURL('/mis-cursos/mat-srtm-1')
  await expect(page.getByRole('heading', { level: 1, name: 'Licencias de anuncios con SRTM' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Tipos de anuncio' })).toBeVisible()
  expect(api.enrollRequests).toEqual([{ offering: 'edicion-srtm-2026-11', idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/) }])
  expect(api.unexpected).toEqual([])
})

test('una edición cerrada o sin cupo (409) se explica y la ficha sigue a la vista', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, enrolled: false })
  api.failOnce((url) => url.pathname === '/api/lms/enrollments', 409)
  await page.goto(`/cursos/${SLUG}`)

  await offerings(page).getByRole('button', { name: ACTION }).click()

  const alert = offerings(page).getByRole('alert')
  await expect(alert).toContainText('No pudimos matricularte: la inscripción de esta edición está cerrada o ya no quedan plazas.')
  await expect(page).toHaveURL(`/cursos/${SLUG}`)

  // volver a intentarlo, ya con plaza, matricula
  await offerings(page).getByRole('button', { name: ACTION }).click()
  await expect(page).toHaveURL('/mis-cursos/mat-srtm-1')
  expect(api.enrollRequests).toHaveLength(2)
  expect(api.enrollRequests[0]?.idempotencyKey).not.toBe(api.enrollRequests[1]?.idempotencyKey)
})
