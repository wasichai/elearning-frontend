import { expect, test, type Page } from '@playwright/test'
import { fakeApi, isCourseList } from './api'

// el catálogo público con la API simulada: búsqueda y filtros viajan al servidor, y un fallo se explica y se recupera

const results = (page: Page) => page.getByRole('region', { name: 'Resultados' })
const courses = (page: Page) => results(page).getByRole('listitem')
const lastParam = (urls: URL[], name: string) => urls.at(-1)?.searchParams.get(name)

test('buscar y filtrar: la petición lleva el filtro y la lista cambia', async ({ page }) => {
  const api = await fakeApi(page)
  await page.goto('/cursos')

  await expect(page.getByRole('heading', { level: 1, name: 'Catálogo de cursos' })).toBeVisible()
  await expect(courses(page)).toHaveCount(2)
  await expect(results(page).getByRole('status')).toHaveText('2 cursos')
  expect(lastParam(api.catalogRequests, 'page')).toBe('0')
  expect(lastParam(api.catalogRequests, 'size')).toBe('12')

  // búsqueda libre
  await page.getByRole('searchbox', { name: 'Buscar cursos' }).fill('SGSPE')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect.poll(() => lastParam(api.catalogRequests, 'q')).toBe('SGSPE')
  await expect(courses(page)).toHaveCount(1)
  await expect(courses(page).getByRole('link')).toHaveText('Introducción al SGSPE')
  await expect(page).toHaveURL(/\/cursos\?q=SGSPE$/)

  // limpiar vuelve al catálogo entero
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(courses(page)).toHaveCount(2)
  await expect(page.getByRole('searchbox', { name: 'Buscar cursos' })).toHaveValue('')

  // un filtro de selección: nivel
  await page.getByRole('combobox', { name: 'Nivel' }).click()
  await page.getByRole('option', { name: 'Intermedio' }).click()
  await expect.poll(() => lastParam(api.catalogRequests, 'level')).toBe('INTERMEDIO')
  await expect(courses(page)).toHaveCount(1)
  await expect(courses(page).getByRole('link')).toHaveText('Introducción al SGSPE')

  // y otro encima: categoría (de los facets). ninguno cumple ambos
  await page.getByRole('combobox', { name: 'Categoría' }).click()
  await page.getByRole('option', { name: 'Gestión municipal (2)' }).click()
  await expect.poll(() => api.catalogRequests.at(-1)?.search).toMatch(/category=gestion-municipal/)
  expect(lastParam(api.catalogRequests, 'level')).toBe('INTERMEDIO')
  await expect(results(page).getByText('Ningún curso coincide con la búsqueda')).toBeVisible()

  expect(api.unexpected).toEqual([])
})

test('filtros de duración, inscripción y horas: la lista cambia y, sin resultados, el estado vacío deja limpiar', async ({ page }) => {
  const api = await fakeApi(page)
  await page.goto('/cursos')
  await expect(courses(page)).toHaveCount(2)

  await page.getByRole('combobox', { name: 'Inscripción' }).click()
  await page.getByRole('option', { name: 'Con inscripción abierta' }).click()
  await expect.poll(() => lastParam(api.catalogRequests, 'enrollmentOpen')).toBe('true')
  await expect(courses(page)).toHaveCount(1)
  await expect(page).toHaveURL(/\/cursos\?enrollmentOpen=true$/)

  await page.getByLabel('Horas de trabajo autónomo (mínimo)').fill('20')
  await page.getByLabel('Horas de trabajo autónomo (mínimo)').press('Enter')
  await expect.poll(() => lastParam(api.catalogRequests, 'minAutonomousHours')).toBe('20')
  await expect(courses(page)).toHaveCount(1)

  await page.getByRole('combobox', { name: 'Duración' }).click()
  await page.getByRole('option', { name: 'Semestral (12 a 26 semanas)' }).click()
  await expect.poll(() => lastParam(api.catalogRequests, 'minWeeks')).toBe('12')
  await expect(results(page).getByText('Ningún curso coincide con la búsqueda')).toBeVisible()

  await results(page).getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(courses(page)).toHaveCount(2)
  await expect(page.getByLabel('Horas de trabajo autónomo (mínimo)')).toHaveValue('')
  expect(api.unexpected).toEqual([])
})

test('un error del servidor se explica y «Reintentar» lo recupera', async ({ page }) => {
  const api = await fakeApi(page)
  api.failOnce(isCourseList, 500)
  await page.goto('/cursos')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('No pudimos cargar el catálogo')
  await expect(alert).toContainText('El servidor tuvo un problema (error 500). Inténtalo de nuevo en unos minutos.')
  await expect(courses(page)).toHaveCount(0)

  await alert.getByRole('button', { name: 'Reintentar' }).click()
  await expect(courses(page)).toHaveCount(2)
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(api.catalogRequests).toHaveLength(2)
})
