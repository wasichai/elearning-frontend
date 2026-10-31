import { expect, test, type Page } from '@playwright/test'

// humo contra el backend de verdad, sin simular nada: el perfil dev con los datos de demostración aplicados
// (README, «Humo contra el backend real»). solo con E2E_REAL=1 (yarn e2e:real)
test.skip(!process.env.E2E_REAL, 'solo con E2E_REAL=1 y el backend en marcha')

const API_URL = process.env.WASICHAI_API_URL ?? 'http://localhost:8090'
const COURSES = '/api/lms/public/catalog/courses'

// los cursos publicados de los datos de demostración, y el borrador que no debe verse
const PUBLISHED = [
  { code: 'SRTM-ANU-101', title: /^Rentas municipales \(SRTM\)/ },
  { code: 'SGSPE-101', title: /^SGSPE: primeros pasos/ },
  { code: 'IA-AGT-201', title: /^Agentes de IA con trazabilidad/ },
  { code: 'CORTO-101', title: /^Curso corto: mensajes de error claros/ }
]
const DRAFT = 'Atención al contribuyente en ventanilla'

const courses = (page: Page) => page.getByRole('region', { name: 'Resultados' }).getByRole('listitem')

test.beforeAll(async ({ request }) => {
  const response = await request.get(`${API_URL}${COURSES}`).catch((error: Error) => error)
  const status = response instanceof Error ? response.message : `HTTP ${response.status()}`
  expect(response instanceof Error ? 0 : response.status(), `el backend no contesta en ${API_URL} (${status}): prepáralo como dice el README`).toBe(200)
})

test('el catálogo muestra los cuatro cursos publicados y no el borrador', async ({ page }) => {
  await page.goto('/cursos')
  await expect(courses(page)).toHaveCount(PUBLISHED.length)
  await expect(page.getByRole('region', { name: 'Resultados' }).getByRole('status')).toHaveText(`${PUBLISHED.length} cursos`)
  for (const course of PUBLISHED) await expect(courses(page).getByRole('link', { name: course.title })).toBeVisible()
  await expect(page.getByText(DRAFT)).toHaveCount(0)

  // ni buscándolo por su título
  await page.getByRole('searchbox', { name: 'Buscar cursos' }).fill(DRAFT)
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page.getByText('Ningún curso coincide con la búsqueda')).toBeVisible()
})

test('cada curso publicado abre su ficha completa', async ({ page }) => {
  for (const course of PUBLISHED) {
    await page.goto('/cursos')
    await courses(page).getByRole('link', { name: course.title }).click()
    // la ficha entera cumple el contrato de la interfaz: si no, saldría «No pudimos leer la respuesta del servidor»
    await expect(page.getByRole('heading', { level: 1, name: course.title })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByText(course.code, { exact: true })).toBeVisible()
  }
})

test('la ficha del curso de IA: 216 h y créditos ECTS propuestos', async ({ page }) => {
  await page.goto('/cursos')
  await courses(page).getByRole('link', { name: PUBLISHED[2]!.title }).click()
  await expect(page.getByRole('heading', { level: 1, name: PUBLISHED[2]!.title })).toBeVisible()
  await expect(page.getByText('6 semanas · 216 h').first()).toBeVisible()
  await expect(page.getByRole('cell', { name: '216' })).toBeVisible()
  await expect(page.getByText(/créditos ECTS propuestos — no oficiales$/)).toBeVisible()
})

test('un slug inexistente es «Curso no encontrado»', async ({ page }) => {
  await page.goto('/cursos/no-existe-este-curso')
  await expect(page.getByRole('heading', { level: 1, name: 'Curso no encontrado' })).toBeVisible()
  await page.getByRole('link', { name: 'Catálogo' }).click()
  await expect(courses(page)).toHaveCount(PUBLISHED.length)
})

test('la ruta pública no deja escribir: un POST anónimo es 401', async ({ page, request }) => {
  // desde el navegador, por el mismo origen que la interfaz (el proxy de vite preview), sin credenciales
  await page.goto('/cursos')
  const fromBrowser = await page.evaluate(async (path) => {
    const response = await fetch(path, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'E2E-POST', title: 'No debería existir' })
    })
    return response.status
  }, COURSES)
  expect(fromBrowser).toBe(401)

  // y directo al backend
  const direct = await request.post(`${API_URL}${COURSES}`, { data: { code: 'E2E-POST', title: 'No debería existir' } })
  expect(direct.status()).toBe(401)

  await page.reload()
  await expect(courses(page)).toHaveCount(PUBLISHED.length)
})
