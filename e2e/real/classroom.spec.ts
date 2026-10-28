import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// recorridos 1–4 del aula contra el backend de verdad (perfil dev con los datos de demostración aplicados; README,
// «Humo contra el backend real»): iniciar sesión, matricularse desde la ficha, abrir la unidad y sus recursos, completar
// y conservar el progreso al recargar. cada ejecución crea su estudiante con el administrador del perfil dev, así que
// se puede repetir sin limpiar nada. solo con E2E_REAL=1 (yarn e2e:real)
test.skip(!process.env.E2E_REAL, 'solo con E2E_REAL=1 y el backend en marcha')

const API_URL = process.env.WASICHAI_API_URL ?? 'http://localhost:8090'
// las del administrador de la semilla dev y la de los usuarios demo, como en model/apply.py
const ADMIN = { email: process.env.WASICHAI_EMAIL ?? 'admin@wasichai.local', password: process.env.WASICHAI_PASSWORD ?? 'admin' }
const DEMO_PASSWORD = process.env.WASICHAI_DEMO_PASSWORD
const COURSE = /^Rentas municipales \(SRTM\)/

async function token(request: APIRequestContext, email: string, password: string): Promise<string> {
  const response = await request.post(`${API_URL}/api/auth/login`, { data: { email, password } })
  expect(response.status(), `no se pudo iniciar sesión como ${email} en ${API_URL}`).toBe(200)
  return ((await response.json()) as { token: string }).token
}

async function newStudent(request: APIRequestContext): Promise<{ email: string; password: string }> {
  const admin = await token(request, ADMIN.email, ADMIN.password)
  const student = { email: `e2e-${randomUUID()}@demo.wasichai-learning.test`, password: `E2e-${randomUUID()}` }
  const response = await request.post(`${API_URL}/api/users`, {
    headers: { Authorization: `Bearer ${admin}` },
    data: { ...student, displayName: 'Estudiante e2e', roles: ['ESTUDIANTE'] }
  })
  expect(response.status()).toBe(201)
  return student
}

async function signIn(page: Page, user: { email: string; password: string }) {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(user.email)
  await page.getByLabel('Contraseña').fill(user.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}

async function srtmSlug(request: APIRequestContext): Promise<string> {
  const response = await request.get(`${API_URL}/api/lms/public/catalog/courses?q=SRTM`)
  const body = (await response.json()) as { content: { code: string; slug: string }[] }
  const course = body.content.find((c) => c.code === 'SRTM-ANU-101')
  expect(course, 'el catálogo aún no muestra SRTM-ANU-101: aplica la demo y espera el refresco (30 s)').toBeDefined()
  return course!.slug
}

const units = (page: Page) => page.getByRole('navigation', { name: 'Unidades del curso' })

test('un estudiante inicia sesión, se matricula desde la ficha, estudia y conserva su progreso', async ({ page, request }) => {
  const student = await newStudent(request)
  const slug = await srtmSlug(request)

  // 1. iniciar sesión y 2. matricularse desde la ficha pública
  await signIn(page, student)
  await page.goto(`/cursos/${slug}`)
  await page.getByRole('button', { name: /^Matricularme en la edición/ }).click()
  await expect(page).toHaveURL(/\/mis-cursos\/[0-9a-f-]{36}/)
  await expect(page.getByRole('heading', { level: 1, name: COURSE })).toBeVisible()

  // 3. abrir la unidad y su lectura: el HTML del servidor, en el iframe aislado
  await units(page)
    .getByRole('link', { name: /^Lo que necesita para entrar/ })
    .click()
  await expect(page.getByRole('heading', { level: 2, name: 'Lo que necesita para entrar' })).toBeVisible()
  const reading = page.frameLocator('iframe[title="Entrar y salir del portal (lectura)"]')
  await expect(reading.getByRole('heading', { level: 1, name: 'Entrar y salir del portal' })).toBeVisible()
  await expect(page.locator('iframe[title="Entrar y salir del portal (lectura)"]')).toHaveAttribute('sandbox', '')

  // 4. completar y verlo tras recargar: lo guardó el servidor
  await page.getByRole('button', { name: 'Marcar como completada' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 2, name: 'Lo que necesita para entrar' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Marcar como completada' })).toHaveCount(0)
  await expect(units(page).getByRole('link', { name: /^Lo que necesita para entrar.*Completada/ })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Progreso del curso' })).not.toHaveAttribute('aria-valuenow', '0')
})

test('la guía PDF se descarga y el vídeo completa su lección al terminar', async ({ page, request }) => {
  const student = await newStudent(request)
  const slug = await srtmSlug(request)
  await signIn(page, student)
  await page.goto(`/cursos/${slug}`)
  await page.getByRole('button', { name: /^Matricularme en la edición/ }).click()
  await expect(page).toHaveURL(/\/mis-cursos\/[0-9a-f-]{36}/)

  await units(page)
    .getByRole('link', { name: /^Cómo se deduce el estado/ })
    .click()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: /^Descargar guia-estados-del-anuncio\.pdf/ }).click()
  expect((await downloading).suggestedFilename()).toBe('guia-estados-del-anuncio.pdf')

  await units(page)
    .getByRole('link', { name: /^Recorrido en vídeo/ })
    .click()
  await expect(page.getByRole('button', { name: 'Marcar como completada' })).toHaveCount(0)
  const video = page.locator('video')
  await expect(video).toHaveAttribute('src', /^blob:/)
  await video.evaluate(async (element: HTMLVideoElement) => {
    element.muted = true
    await element.play()
  })
  await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible({ timeout: 20_000 })
  await page.reload()
  await expect(units(page).getByRole('link', { name: /^Recorrido en vídeo.*Completada/ })).toBeVisible()
})

test('el estudiante demo encuentra su curso en «Mis cursos»', async ({ page }) => {
  test.skip(!DEMO_PASSWORD, 'necesita WASICHAI_DEMO_PASSWORD, la de los usuarios demo')
  await signIn(page, { email: 'estudiante@demo.wasichai-learning.test', password: DEMO_PASSWORD! })
  await page.getByRole('link', { name: 'Mis cursos' }).click()
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: COURSE }) })
  await expect(card.getByRole('progressbar', { name: 'Progreso del curso' })).toBeVisible()
  await card.getByRole('link', { name: /^(Continuar|Repasar) «/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: COURSE })).toBeVisible()
})
