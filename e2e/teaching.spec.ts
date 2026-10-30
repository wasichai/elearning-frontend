import { expect, test } from '@playwright/test'
import { fakeApi } from './api'

// el espacio docente (ADR-0016) con la API simulada: sus ediciones y sus matriculados

test('un docente encuentra «Docencia» en el menú, abre su edición y ve a sus matriculados', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.goto('/')

  await page.getByRole('link', { name: 'Mis ediciones' }).click()
  await expect(page).toHaveURL('/docencia')
  await expect(page.getByRole('heading', { level: 1, name: 'Mis ediciones' })).toBeVisible()
  const sgspe = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Introducción al SGSPE' }) })
  await expect(sgspe).toContainText('2 matriculados')
  await expect(sgspe).toContainText('1 intento por corregir')
  await sgspe.getByRole('link', { name: 'Introducción al SGSPE' }).click()

  await expect(page).toHaveURL('/docencia/edicion-sgspe-2026-09')
  await expect(page.getByRole('heading', { level: 1, name: 'Introducción al SGSPE' })).toBeVisible()
  const table = page.getByRole('table', { name: '2 matriculados' })
  const row = table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'estudiante@demo.local' }) })
  await expect(row).toContainText('33 % (1 de 3 lecciones)')
  await expect(row).toContainText('1 de 2 sesiones')
  await expect(row).toContainText('Evaluación final: pendiente de corrección')
  await page.getByRole('link', { name: '← Mis ediciones' }).click()
  await expect(page).toHaveURL('/docencia')
  expect(api.teachingRequests).toContain('GET /api/lms/teaching/offerings/edicion-sgspe-2026-09/students')
  expect(api.unexpected).toEqual([])
})

test('un estudiante no ve «Docencia» en el menú', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/')

  await expect(page.getByRole('link', { name: 'Mis cursos' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Mis ediciones' })).toHaveCount(0)
  await expect(page.getByText('Docencia', { exact: true })).toHaveCount(0)
})

test('sin ediciones asignadas, la página lo dice con claridad', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'teacher', noOfferings: true })
  await page.goto('/docencia')

  await expect(page.getByText('No tienes ediciones asignadas')).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(0)
})

test('una edición ajena se explica: solo se ven las asignadas', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.goto('/docencia/edicion-de-otro')

  await expect(page.getByRole('alert')).toContainText('Esta edición no está entre las tuyas')
  await page.getByRole('link', { name: '← Mis ediciones' }).click()
  await expect(page).toHaveURL('/docencia')
})
