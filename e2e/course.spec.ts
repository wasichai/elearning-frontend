import { expect, test } from '@playwright/test'
import { courseDetail } from '../src/modules/catalog/test/fixtures'
import { fakeApi, isCourse } from './api'

// la ficha pública: se abre desde la lista, dice que los créditos son una propuesta y escribe las fechas en su zona

const SLUG = 'srtm-anuncios'
const TITLE = 'Licencias de anuncios con SRTM'

test('abrir una ficha desde la lista: créditos propuestos y fechas con su zona', async ({ page }) => {
  const api = await fakeApi(page)
  await page.goto('/cursos')

  await page.getByRole('link', { name: TITLE }).click()
  await expect(page).toHaveURL(`/cursos/${SLUG}`)
  await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible()
  expect(api.catalogRequests.at(-1)?.pathname).toBe(`/api/lms/public/catalog/courses/${SLUG}`)

  // créditos: una propuesta, nunca un dato oficial
  await expect(page.getByText('8 créditos ECTS propuestos — no oficiales')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Carga de trabajo y créditos' })).toBeVisible()

  // fechas civiles de la edición, con su zona dicha
  const offerings = page.getByRole('heading', { level: 2, name: 'Ediciones' }).locator('..')
  await expect(offerings.getByRole('heading', { level: 3 })).toContainText('9 nov – 4 dic 2026')
  await expect(offerings.getByText('15 oct – 6 nov 2026')).toBeVisible()
  await expect(offerings.getByText(/^hora .*Perú \(America\/Lima\)$/)).toBeVisible()

  expect(api.unexpected).toEqual([])
})

test.describe('con el navegador en otra zona horaria', () => {
  // en Honolulu (UTC−10) la medianoche UTC del 9 de noviembre aún es el día 8: la fecha civil no debe moverse
  test.use({ timezoneId: 'Pacific/Honolulu' })

  test('las fechas de la edición siguen siendo las de su zona', async ({ page }) => {
    await fakeApi(page)
    await page.goto(`/cursos/${SLUG}`)
    const offerings = page.getByRole('heading', { level: 2, name: 'Ediciones' }).locator('..')
    await expect(offerings.getByRole('heading', { level: 3 })).toContainText('9 nov – 4 dic 2026')
    await expect(offerings.getByText(/\(America\/Lima\)$/)).toBeVisible()
  })
})

test('un slug desconocido es «Curso no encontrado» y se vuelve al catálogo', async ({ page }) => {
  const api = await fakeApi(page)
  await page.goto('/cursos/no-existe')

  await expect(page.getByRole('heading', { level: 1, name: 'Curso no encontrado' })).toBeVisible()
  await expect(page.getByText('No existe, ya no está publicado o el enlace está mal escrito.')).toBeVisible()
  // un 404 es una respuesta, no un fallo: nada de «Reintentar»
  await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0)

  await page.getByRole('link', { name: 'Catálogo' }).click()
  await expect(page).toHaveURL('/cursos')
  await expect(page.getByRole('region', { name: 'Resultados' }).getByRole('listitem')).toHaveCount(2)
  expect(api.unexpected).toEqual([])
})

test('un error del servidor en la ficha se explica y «Reintentar» lo recupera', async ({ page }) => {
  const api = await fakeApi(page)
  api.failOnce(isCourse(SLUG), 503)
  await page.goto(`/cursos/${SLUG}`)

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('No pudimos cargar el curso')
  await expect(alert).toContainText('Código del error: 503')
  await alert.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test.describe('a 1440 × 900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('«En esta página» se ve entero al abrir la ficha, y solo la edición recomendada se queda fija al desplazar', async ({ page }) => {
    await fakeApi(page, { signedIn: true, enrolled: false })
    // como en la demo: la abierta y dos más, que antes empujaban el índice fuera de la pantalla
    const [open] = courseDetail.offerings
    const later = (code: string, startDate: string, endDate: string) => ({
      ...open!,
      code,
      status: 'PROGRAMADA',
      startDate,
      endDate,
      enrollmentOpen: false,
      enrollmentStatus: 'CLOSED'
    })
    const offerings = [open, later('edicion-2027-01', '2027-01-11', '2027-02-05'), later('edicion-2027-03', '2027-03-08', '2027-04-02')]
    await page.route(isCourse(SLUG), (route) => route.fulfill({ json: { ...courseDetail, offerings } }))
    await page.goto(`/cursos/${SLUG}`)
    const index = page.getByRole('navigation', { name: 'En esta página' })
    const entries = index.getByRole('link')
    await expect(entries).toHaveCount(8)
    for (const entry of await entries.all()) await expect(entry).toBeInViewport({ ratio: 1 })
    // el índice va antes que las demás ediciones, y la columna no tiene barra de desplazamiento propia
    const aside = page.locator('[data-slot="course-aside"]')
    expect(await aside.evaluate((element) => getComputedStyle(element).overflowY)).toBe('visible')

    // al bajar, la recomendada y su acción siguen a la vista; el índice no
    const recommended = page.locator('[data-slot="recommended-offering"]')
    await page.getByRole('heading', { level: 2, name: 'Datos del curso' }).scrollIntoViewIfNeeded()
    await expect(recommended).toBeInViewport()
    await expect(recommended.getByRole('button', { name: /^Matricularme en la edición/ })).toBeInViewport()
    await expect(entries.first()).not.toBeInViewport()
  })
})
