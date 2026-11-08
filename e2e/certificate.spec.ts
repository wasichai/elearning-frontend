import { expect, test } from '@playwright/test'
import { fakeApi } from './api'

// sesiones, finalización y certificado (ADR-0016) con la API simulada

test('las sesiones del curso: horas de Lima con su zona, estado, enlace https y asistencia', async ({ page }) => {
  // las sesiones de los ejemplos tienen fecha fija: se mira la agenda antes de la primera, con todas por delante
  await page.clock.setFixedTime(new Date('2026-09-01T12:00:00Z'))
  const api = await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-sgspe-1')
  const tabs = page.getByRole('navigation', { name: 'Secciones del curso' })
  await tabs.getByRole('link', { name: 'Sesiones' }).click()

  await expect(page).toHaveURL('/mis-cursos/mat-sgspe-1/sesiones')
  await expect(page.getByText(/^Horas en hora (estándar )?de Perú$/)).toBeVisible()
  const first = page.getByRole('article', { name: 'Presentación del curso' })
  await expect(page.getByRole('heading', { name: /^martes.*8 de septiembre de 2026$/ })).toBeVisible()
  await expect(first).toContainText('8:00')
  await expect(first).toContainText('Reprogramada')
  await expect(first).toContainText('presente')
  await expect(first.getByRole('link', { name: /^Entrar a la sesión/ })).toHaveAttribute('href', 'https://meet.example/sgspe-1')
  const cancelled = page.getByRole('article', { name: 'Consulta de la unidad' })
  await expect(cancelled).toContainText('Cancelada')
  await expect(cancelled.getByRole('link', { name: /^Entrar/ })).toHaveCount(0)
  await tabs.getByRole('link', { name: 'Lecciones' }).click()
  await expect(page).toHaveURL('/mis-cursos/mat-sgspe-1')
  expect(api.unexpected).toEqual([])
})

test('sin cumplir las reglas no se puede pedir el certificado', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-sgspe-1/finalizacion')

  const rules = page.getByRole('region', { name: 'Para terminar el curso' })
  await expect(rules).toContainText('1 de 3 lecciones')
  await expect(rules).toContainText('0 de 1 evaluaciones aprobadas')
  await expect(page.getByText('Cuando cumplas todas las reglas podrás pedir aquí tu certificado.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Emitir mi certificado' })).toHaveCount(0)
})

test('recorrido: cumplir las reglas → pedir el certificado con el nombre → verlo, imprimirlo y encontrarlo en «Mis cursos»', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, courseComplete: true })
  await page.goto('/mis-cursos/mat-sgspe-1')
  await page.getByRole('navigation', { name: 'Secciones del curso' }).getByRole('link', { name: 'Finalización' }).click()

  await expect(page.getByText('Cumples todas las reglas: ya puedes pedir tu certificado.')).toBeVisible()
  const name = page.getByRole('textbox', { name: 'Nombre para el certificado' })
  await expect(name).toHaveValue('Rosa Estudiante')
  await name.fill('Rosa Quispe Mamani')
  await page.getByRole('button', { name: 'Emitir mi certificado' }).click()
  // el nombre no cambia después: se confirma con el nombre a la vista (RNF-UX-08)
  const issue = page.getByRole('dialog', { name: '¿Emitir el certificado a nombre de Rosa Quispe Mamani?' })
  await issue.getByRole('button', { name: 'Emitir' }).click()

  await expect(page.getByText('Certificado emitido a nombre de Rosa Quispe Mamani.')).toBeVisible()
  await page.getByRole('link', { name: 'Ver mi certificado' }).click()
  await expect(page).toHaveURL('/certificados/K7Q2-M9XW-4RTB')
  await expect(page.getByRole('heading', { level: 1, name: 'Rosa Quispe Mamani' })).toBeVisible()
  await expect(page.getByText('aprobó el curso «Introducción al SGSPE».')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Imprimir' })).toBeVisible()

  // al imprimir solo queda el certificado: sin cabecera ni botones
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('heading', { level: 1, name: 'Rosa Quispe Mamani' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Imprimir' })).toBeHidden()
  await expect(page.getByRole('banner')).toBeHidden()
  // tampoco la banda de verificación ni el enlace: el papel es solo el documento
  await expect(page.getByRole('status')).toBeHidden()
  await expect(page.getByRole('link', { name: 'Verificar otro certificado' })).toBeHidden()
  await page.emulateMedia({ media: 'screen' })

  await page.goto('/mis-cursos')
  await expect(page.getByText('Certificado emitido')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver el certificado de «Introducción al SGSPE»' })).toHaveAttribute('href', '/certificados/K7Q2-M9XW-4RTB')
  expect(api.certificateRequests).toEqual(['/api/lms/public/certificates/K7Q2-M9XW-4RTB'])
  expect(api.unexpected).toEqual([])
})

test('la verificación es pública: sin sesión, por código; uno desconocido se dice', async ({ page }) => {
  const api = await fakeApi(page, { certificateIssued: true })
  await page.goto('/certificados')

  await expect(page.getByRole('heading', { level: 1, name: 'Verificar un certificado' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Código del certificado' }).fill('k7q2-m9xw-4rtb')
  await page.getByRole('button', { name: 'Verificar' }).click()
  await expect(page).toHaveURL('/certificados/K7Q2-M9XW-4RTB')
  await expect(page.getByRole('status')).toContainText('Certificado válido')
  await expect(page.getByRole('heading', { level: 1, name: 'Rosa Quispe Mamani' })).toBeVisible()

  await page.goto('/certificados/NO-EXISTE')
  await expect(page.getByRole('heading', { level: 1, name: 'No encontramos un certificado con el código NO-EXISTE' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Código del certificado' })).toHaveValue('NO-EXISTE')
  await expect(page.getByText('Certificado válido', { exact: true })).toHaveCount(0)
  expect(api.unexpected).toEqual([])
})

test('el certificado es un A4 apaisado en tema claro, aunque la página esté en oscuro, y se imprime en una sola hoja', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('elearning.theme', 'colofon-dark'))
  await fakeApi(page, { certificateIssued: true })
  await page.goto('/certificados/K7Q2-M9XW-4RTB')
  const sheet = page.getByRole('article', { name: 'Rosa Quispe Mamani' })
  await expect(sheet).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'colofon-dark')

  // papel y tinta del tema claro de Colofón
  expect(await sheet.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(255, 255, 255)')
  expect(await sheet.evaluate((element) => getComputedStyle(element).color)).toBe('rgb(23, 32, 43)')
  const box = (await sheet.boundingBox())!
  expect(box.width / box.height).toBeCloseTo(297 / 210, 1)

  // el PDF de la impresión: una sola hoja A4 apaisada (841,89 × 595,28 pt)
  await page.emulateMedia({ media: 'print' })
  // el documento ocupa la hoja entera, sin márgenes de la página: A4 apaisado a 96 ppp
  const printed = (await sheet.boundingBox())!
  expect([printed.x, printed.y]).toEqual([0, 0])
  // CERTIFICATE_PDF: deja el PDF en esa ruta para mirarlo
  const pdf = (await page.pdf({ preferCSSPageSize: true, path: process.env.CERTIFICATE_PDF })).toString('latin1')
  expect(pdf.match(/\/Type\s*\/Page\b/g)).toHaveLength(1)
  const [, width, height] = /\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/.exec(pdf) ?? []
  expect([Math.round(Number(width)), Math.round(Number(height))]).toEqual([842, 595])
})

test('en el móvil el certificado se lee en una columna, sin desbordar', async ({ page }) => {
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await fakeApi(page, { certificateIssued: true })
    await page.goto('/certificados/K7Q2-M9XW-4RTB')
    await expect(page.getByRole('heading', { level: 1, name: 'Rosa Quispe Mamani' })).toBeVisible()
    await expect(page.getByRole('status')).toContainText('Certificado válido')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
})

test('la agenda separa próximas y pasadas: a lo que terminó no se entra, y la cabecera da la asistencia', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-01T12:00:00Z'))
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-sgspe-1/sesiones')

  await expect(page.getByRole('region', { name: 'Próximas' }).getByRole('article', { name: 'Recuperación de la consulta' })).toBeVisible()
  const past = page.getByRole('region', { name: 'Pasadas' })
  await expect(past.getByRole('article')).toHaveCount(2)
  await expect(past.getByRole('link', { name: /^Entrar/ })).toHaveCount(0)
  // la cancelada: tachada y con su palabra
  const cancelled = past.getByRole('article', { name: 'Consulta de la unidad' })
  await expect(cancelled.getByText('Cancelada')).toBeVisible()
  await expect(cancelled.getByText('Consulta de la unidad')).toHaveCSS('text-decoration-line', 'line-through')
  await expect(page.getByRole('list', { name: 'Tu avance' })).toContainText('1 de 2 sesiones con asistencia')
})
