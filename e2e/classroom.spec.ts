import { expect, test } from '@playwright/test'
import { fakeApi } from './api'

// el aula del estudiante con la API simulada y una sesión de estudiante

const COURSE = 'Licencias de anuncios con SRTM'

test('«Mis cursos» está en el menú y lleva a la siguiente lección con «Continuar»', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  await page.goto('/')

  await page.getByRole('link', { name: 'Mis cursos' }).click()
  await expect(page).toHaveURL('/mis-cursos')
  await expect(page.getByRole('heading', { level: 1, name: 'Mis cursos' })).toBeVisible()

  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: COURSE }) })
  await expect(card.getByRole('progressbar', { name: 'Progreso del curso' })).toHaveAttribute('aria-valuenow', '33')
  await expect(card.getByText('9 nov – 4 dic 2026')).toBeVisible()
  await card.getByRole('link', { name: `Continuar «${COURSE}»` }).click()

  await expect(page).toHaveURL('/mis-cursos/mat-srtm-1?leccion=lec-video')
  await expect(page.getByRole('heading', { level: 1, name: COURSE })).toBeVisible()
  expect(api.classroomRequests).toEqual(['GET /api/lms/classroom/enrollments', 'GET /api/lms/classroom/enrollments/mat-srtm-1'])
  expect(api.unexpected).toEqual([])
})

test('sin sesión, «Mis cursos» pide iniciar sesión', async ({ page }) => {
  await fakeApi(page)
  await page.goto('/mis-cursos')
  await expect(page).toHaveURL('/login')
})

test('una matrícula ajena es «No encontramos este curso en tus matrículas»', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/de-otra-persona')
  await expect(page.getByRole('heading', { level: 1, name: 'No encontramos este curso en tus matrículas' })).toBeVisible()
  await page.getByRole('link', { name: '← Mis cursos' }).click()
  await expect(page).toHaveURL('/mis-cursos')
})
