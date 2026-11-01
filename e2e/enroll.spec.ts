import { expect, test, type Page } from '@playwright/test'
import { fakeApi, isCourseList } from './api'

// matricularse desde la ficha pública: sin sesión lleva al inicio de sesión; con sesión matricula y abre el aula

const SLUG = 'srtm-anuncios'
const ACTION = /^Matricularme en la edición 9 nov\s–\s4 dic 2026$/
const offerings = (page: Page) => page.getByRole('heading', { level: 2, name: 'Ediciones' }).locator('..')

test('sin sesión, «Inicia sesión para matricularte» lleva al inicio de sesión de Wasichai y vuelve a la ficha', async ({ page }) => {
  const api = await fakeApi(page, { enrolled: false })
  await page.goto(`/cursos/${SLUG}`)

  await expect(offerings(page).getByRole('button', { name: ACTION })).toHaveCount(0)
  await offerings(page).getByRole('link', { name: 'Inicia sesión para matricularte' }).click()
  await expect(page).toHaveURL(`/login?returnTo=%2Fcursos%2F${SLUG}`)
  await page.getByLabel('Correo').fill('estudiante@demo.local')
  await page.getByLabel('Contraseña').fill('una-contraseña')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()

  await expect(page).toHaveURL(`/cursos/${SLUG}`)
  await expect(offerings(page).getByRole('button', { name: ACTION })).toBeVisible()
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

// RF-CAT-09: la edición completa se anuncia en la tarjeta y en la ficha, el filtro «abierta» la deja fuera y no hay botón
test('una edición completa se dice en el catálogo y en la ficha, sin ofrecer matricularse', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, enrolled: false, offeringFull: true })
  await page.goto('/cursos')

  const card = page.getByRole('region', { name: 'Resultados' }).getByRole('listitem').filter({ hasText: 'Licencias de anuncios con SRTM' })
  await expect(card).toContainText('Edición completa')

  await page.getByRole('combobox', { name: 'Inscripción' }).click()
  await page.getByRole('option', { name: 'Con inscripción abierta' }).click()
  await expect.poll(() => api.catalogRequests.filter(isCourseList).at(-1)?.searchParams.get('enrollmentOpen')).toBe('true')
  await expect(card).toHaveCount(0)

  await page.goto(`/cursos/${SLUG}`)
  await expect(offerings(page).getByText('Edición completa')).toBeVisible()
  await expect(offerings(page).getByRole('button')).toHaveCount(0)
  expect(api.enrollRequests).toEqual([])
  expect(api.unexpected).toEqual([])
})
