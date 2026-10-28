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
  await expect(card.getByRole('progressbar', { name: 'Progreso del curso' })).toHaveAttribute('aria-valuenow', '0')
  await expect(card.getByText('9 nov – 4 dic 2026')).toBeVisible()
  await card.getByRole('link', { name: `Continuar «${COURSE}»` }).click()

  await expect(page).toHaveURL('/mis-cursos/mat-srtm-1?leccion=lec-html')
  await expect(page.getByRole('heading', { level: 1, name: COURSE })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Tipos de anuncio' })).toBeVisible()
  expect(api.classroomRequests.slice(0, 2)).toEqual(['GET /api/lms/classroom/enrollments', 'GET /api/lms/classroom/enrollments/mat-srtm-1'])
  expect(api.unexpected).toEqual([])
})

test('recorrido: mis cursos → aula → lección HTML → marcar completada → recargar y sigue completada', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos')

  await page.getByRole('link', { name: COURSE, exact: true }).click()
  await expect(page).toHaveURL('/mis-cursos/mat-srtm-1')
  const units = page.getByRole('navigation', { name: 'Unidades del curso' })
  await units.getByRole('link', { name: /^Tipos de anuncio/ }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Tipos de anuncio' })).toBeVisible()
  await expect(page.frameLocator('iframe[title="Tipos de anuncio (lectura)"]').getByRole('heading', { name: 'Tipos de anuncio' })).toBeVisible()
  // abrirla la inició en el servidor
  await expect(units.getByRole('link', { name: 'Tipos de anuncio Empezada' })).toBeVisible()

  await page.getByRole('button', { name: 'Marcar como completada' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible()
  const next = page.getByRole('link', { name: 'Siguiente lección: Recorrido por la pantalla' })
  await expect(next).toBeFocused()
  await expect(units.getByRole('link', { name: 'Tipos de anuncio Completada' })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Progreso del curso' })).toHaveAttribute('aria-valuenow', '33')
  await expect(units.getByRole('heading', { name: /^Unidad 1\./ })).toContainText('1 de 2')

  await page.reload()
  await expect(page.getByRole('heading', { level: 2, name: 'Tipos de anuncio' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Marcar como completada' })).toHaveCount(0)
  await expect(units.getByRole('link', { name: 'Tipos de anuncio Completada' })).toBeVisible()

  const events = api.classroomRequests.filter((request) => request.startsWith('POST'))
  expect(events).toEqual([
    'POST /api/lms/classroom/enrollments/mat-srtm-1/lessons/lec-html/events',
    'POST /api/lms/classroom/enrollments/mat-srtm-1/lessons/lec-html/events'
  ])
  expect(api.unexpected).toEqual([])
})

test('«Mis cursos» muestra el avance que guardó el servidor', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-html')
  await page.getByRole('button', { name: 'Marcar como completada' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible()

  await page.getByRole('link', { name: '← Mis cursos' }).click()
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: COURSE }) })
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33')
  await expect(card.getByText('Siguiente: Recorrido por la pantalla')).toBeVisible()
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

test('la lección HTML se lee en un iframe aislado: su script no corre', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-html')

  await expect(page.getByRole('heading', { level: 2, name: 'Tipos de anuncio' })).toBeVisible()
  const frame = page.locator('iframe[title="Tipos de anuncio (lectura)"]')
  await expect(frame).toHaveAttribute('sandbox', '')
  const content = page.frameLocator('iframe[title="Tipos de anuncio (lectura)"]')
  await expect(content.getByRole('heading', { name: 'Tipos de anuncio' })).toBeVisible()
  await expect(content.locator('body')).not.toHaveAttribute('data-script')
  expect(api.fileRequests).toEqual([{ path: '/api/objects/version_recurso/records/vr-html/files/archivo', authorization: 'Bearer token-e2e' }])
})

test('el PDF se descarga con su nombre y el vídeo se reproduce desde memoria', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-pdf')

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /^Descargar guia-liquidacion\.pdf/ }).click()
  expect((await download).suggestedFilename()).toBe('guia-liquidacion.pdf')

  await page
    .getByRole('navigation', { name: 'Unidades del curso' })
    .getByRole('link', { name: /^Recorrido por la pantalla/ })
    .click()
  await expect(page.locator('video')).toHaveAttribute('src', /^blob:/)
  expect(api.fileRequests.map((file) => file.authorization)).toEqual(['Bearer token-e2e', 'Bearer token-e2e'])
})

test('las unidades se recorren con el teclado y el foco va a la lección abierta', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-srtm-1')
  await expect(page.getByRole('heading', { level: 2, name: 'Tipos de anuncio' })).toBeVisible()

  const target = page.getByRole('navigation', { name: 'Unidades del curso' }).getByRole('link', { name: /^Guía de liquidación/ })
  for (let i = 0; i < 40 && !(await target.evaluate((element) => element === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL('/mis-cursos/mat-srtm-1?leccion=lec-pdf')
  await expect(page.getByRole('heading', { level: 2, name: 'Guía de liquidación' })).toBeFocused()
  await expect(target).toHaveAttribute('aria-current', 'page')
})

test.describe('en un teléfono', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('las unidades se pliegan tras un botón y el aula no desborda su área', async ({ page }) => {
    await fakeApi(page, { signedIn: true })
    await page.goto('/mis-cursos/mat-srtm-1')
    await expect(page.getByRole('heading', { level: 2, name: 'Tipos de anuncio' })).toBeVisible()

    const units = page.getByRole('navigation', { name: 'Unidades del curso' })
    await expect(units).toBeHidden()
    await page.getByRole('button', { name: 'Ver las unidades' }).click()
    await expect(units).toBeVisible()
    await units.getByRole('link', { name: /^Guía de liquidación/ }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Guía de liquidación' })).toBeVisible()
    await expect(units).toBeHidden()

    // el menú lateral del shell de @wasichai/core no se pliega en el móvil (es de core); lo del aula cabe en el resto
    const wider = await page.locator('main').evaluate((main) => {
      const right = main.getBoundingClientRect().right
      return [...main.querySelectorAll('*')]
        .filter((element) => element.getBoundingClientRect().right > right + 0.5)
        .map((element) => `${element.tagName}.${String(element.className).slice(0, 80)}`)
    })
    expect(wider).toEqual([])
  })
})
