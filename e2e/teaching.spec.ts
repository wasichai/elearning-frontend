import { expect, test } from '@playwright/test'
import { offering } from '../src/modules/teaching/test/fixtures'
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
  await expect(row).toContainText('Evaluación final')
  await expect(row).toContainText('Pendiente de corrección')
  await page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Mis ediciones' }).click()
  await expect(page).toHaveURL('/docencia')
  expect(api.teachingRequests).toContain('GET /api/lms/teaching/offerings/edicion-sgspe-2026-09/students')
  expect(api.unexpected).toEqual([])
})

// los ejemplos fijan sus fechas: la agenda y la antigüedad se miran con el reloj de la prueba
const NOW = new Date('2026-11-02T15:00:00Z')

test('las secciones y el selector de la edición llevan a su sitio, y la tabla se ordena y se filtra', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.goto('/docencia/edicion-sgspe-2026-09')

  const sections = page.getByRole('navigation', { name: 'Secciones de la edición' })
  await expect(sections.getByRole('link', { name: 'Matriculados' })).toHaveAttribute('aria-current', 'page')

  const table = page.getByRole('table', { name: '2 matriculados' })
  const emails = table.getByRole('rowheader')
  await expect(emails).toHaveText(['ana.torres@demo.local', 'estudiante@demo.local'])
  await table.getByRole('button', { name: 'Progreso' }).click()
  await expect(table.getByRole('columnheader', { name: 'Progreso' })).toHaveAttribute('aria-sort', 'ascending')
  await expect(emails).toHaveText(['estudiante@demo.local', 'ana.torres@demo.local'])

  await page.getByRole('searchbox', { name: 'Buscar por correo' }).fill('ANA')
  await expect(emails).toHaveText(['ana.torres@demo.local'])
  await expect(page.getByText('1 de 2 matriculados')).toBeVisible()

  await sections.getByRole('link', { name: 'Sesiones' }).click()
  await expect(page).toHaveURL('/docencia/edicion-sgspe-2026-09/sesiones')
  await page.getByRole('combobox', { name: 'Cambiar de edición' }).click()
  await page.getByRole('option', { name: /Licencias de anuncios con SRTM/ }).click()
  await expect(page).toHaveURL('/docencia/edicion-srtm-2026-11/sesiones')
  await expect(page.getByRole('heading', { level: 1, name: 'Licencias de anuncios con SRTM' })).toBeVisible()
})

test('en un móvil cada estudiante es una tarjeta, sin tabla, y su orden se elige con una lista', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.goto('/docencia/edicion-sgspe-2026-09')

  const cards = page.getByRole('list', { name: '2 matriculados' })
  await expect(cards).toContainText('33 % (1 de 3 lecciones)')
  await expect(page.getByRole('table')).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Ordenar por' }).click()
  await page.getByRole('option', { name: 'Menor avance primero' }).click()
  await expect(cards.getByRole('listitem', { name: 'estudiante@demo.local' })).toBeVisible()
})

test('el panel dice qué hay que hacer: cifras, bandeja con acceso directo y agenda', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.clock.setFixedTime(NOW)
  await page.goto('/docencia')

  const figures = page.getByRole('definition')
  await expect(figures).toHaveText(['2', '1', '3'])

  const agenda = page.getByRole('complementary', { name: 'Agenda' })
  const session = agenda.getByRole('link', { name: /Presentación del curso/ })
  await expect(session).toHaveAttribute('href', '/docencia/edicion-sgspe-2026-09/sesiones')
  await expect(session).toContainText(/mar.*10.*nov/i)
  await expect(agenda).not.toContainText('Consulta cancelada')

  const tray = page.getByRole('region', { name: 'Por corregir' })
  await expect(tray).toContainText('estudiante@demo.local')
  await expect(tray).toContainText('Enviado hace 4 días')
  await expect(page.locator('[data-variant="primary"]')).toHaveCount(1)
  // el panel es una sola lectura: ni la lista aparte ni la cola o las sesiones de cada edición
  expect(api.teachingRequests).toEqual(['GET /api/lms/teaching/panel'])
  await tray.getByRole('link', { name: 'Corregir «Evaluación final» de estudiante@demo.local' }).click()
  await expect(page).toHaveURL('/docencia/edicion-sgspe-2026-09/correccion/int-1')
  expect(api.unexpected).toEqual([])
})

test('con más ediciones que una página las lee todas, sin aviso', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.clock.setFixedTime(NOW)
  const COUNT = 130
  const read: number[] = []
  await page.route('**/api/lms/teaching/panel*', (route) => {
    const { searchParams } = new URL(route.request().url())
    const number = Number(searchParams.get('page'))
    const size = Number(searchParams.get('size'))
    read.push(number)
    const rows = Array.from({ length: COUNT }, (_, index) => ({ ...offering, code: `e-${index}`, pendingAttempts: 0, upcomingSessions: [], oldestPending: [] }))
    return route.fulfill({ json: rows.slice(number * size, (number + 1) * size) })
  })
  await page.goto('/docencia')

  await expect(page.getByRole('article')).toHaveCount(COUNT)
  await expect(page.getByRole('definition').first()).toHaveText(String(COUNT))
  expect(read).toEqual([0, 1])
  await expect(page.getByText(/ediciones con más trabajo/)).toHaveCount(0)
})

test('si falla el panel, la bandeja y la agenda lo dicen, y las cifras y las tarjetas siguen', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.clock.setFixedTime(NOW)
  let down = true
  await page.route('**/api/lms/teaching/panel*', (route) =>
    down ? route.fulfill({ status: 500, json: { status: 500, title: 'Error', detail: 'fallo' } }) : route.fallback()
  )
  await page.goto('/docencia')

  const tray = page.getByRole('region', { name: 'Por corregir' })
  await expect(tray.getByRole('alert')).toContainText('No pudimos cargar la cola de corrección')
  const agenda = page.getByRole('complementary', { name: 'Agenda' })
  await expect(agenda.getByRole('alert')).toContainText('No pudimos cargar tus próximas sesiones.')
  await expect(page.getByRole('article')).toHaveCount(2)
  await expect(page.getByRole('definition')).toHaveText(['2', '1', '3'])

  down = false
  await tray.getByRole('button', { name: 'Reintentar: cola de corrección' }).click()
  await expect(tray).toContainText('estudiante@demo.local')
  await expect(agenda).toContainText('Presentación del curso')
  await expect(page.getByRole('alert')).toHaveCount(0)
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
  await page.getByRole('link', { name: 'Ir a Mis cursos' }).click()
  await expect(page).toHaveURL('/mis-cursos')
})

test('una edición ajena se explica: solo se ven las asignadas', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.goto('/docencia/edicion-de-otro')

  await expect(page.getByRole('alert')).toContainText('Esta edición no está entre las tuyas')
  await page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Mis ediciones' }).click()
  await expect(page).toHaveURL('/docencia')
})
