import { expect, test } from '@playwright/test'
import { fakeApi } from './api'

// sesiones, finalización y certificado (ADR-0016) con la API simulada

test('las sesiones del curso: horas de Lima con su zona, estado, enlace https y asistencia', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-sgspe-1')
  await page.getByRole('navigation', { name: 'Más del curso' }).getByRole('link', { name: 'Sesiones en vivo' }).click()

  await expect(page).toHaveURL('/mis-cursos/mat-sgspe-1/sesiones')
  await expect(page.getByText(/^Horas en hora (estándar )?de Perú$/)).toBeVisible()
  const first = page.getByRole('article', { name: 'Presentación del curso' })
  await expect(first).toContainText('8 de septiembre de 2026, 8:00')
  await expect(first).toContainText('Reprogramada')
  await expect(first).toContainText('presente')
  await expect(first.getByRole('link', { name: /^Entrar a la sesión/ })).toHaveAttribute('href', 'https://meet.example/sgspe-1')
  const cancelled = page.getByRole('article', { name: 'Consulta de la unidad' })
  await expect(cancelled).toContainText('Cancelada')
  await expect(cancelled.getByRole('link', { name: /^Entrar/ })).toHaveCount(0)
  await page.getByRole('link', { name: '← Volver al aula' }).click()
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
  await page.getByRole('link', { name: 'Finalización y certificado' }).click()

  await expect(page.getByText('Cumples todas las reglas: ya puedes pedir tu certificado.')).toBeVisible()
  const name = page.getByRole('textbox', { name: 'Nombre para el certificado' })
  await expect(name).toHaveValue('Rosa Estudiante')
  await name.fill('Rosa Quispe Mamani')
  await page.getByRole('button', { name: 'Emitir mi certificado' }).click()
  // el nombre no cambia después: se confirma con el nombre a la vista (RNF-UX-08)
  const issue = page.getByRole('dialog', { name: '¿Emitir el certificado a nombre de Rosa Quispe Mamani?' })
  await issue.getByRole('button', { name: 'Emitir' }).click()

  await expect(page.getByText('Certificado emitido a nombre de Rosa Quispe Mamani.')).toBeVisible()
  await page.getByRole('link', { name: 'Ver e imprimir el certificado' }).click()
  await expect(page).toHaveURL('/certificados/K7Q2-M9XW-4RTB')
  await expect(page.getByRole('heading', { level: 1, name: 'Rosa Quispe Mamani' })).toBeVisible()
  await expect(page.getByText('aprobó el curso «Introducción al SGSPE».')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Imprimir' })).toBeVisible()

  // al imprimir solo queda el certificado: sin cabecera ni botones
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('heading', { level: 1, name: 'Rosa Quispe Mamani' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Imprimir' })).toBeHidden()
  await expect(page.getByRole('banner')).toBeHidden()
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
  await expect(page.getByRole('status')).toHaveText('Certificado auténtico, emitido por esta plataforma.')
  await expect(page.getByRole('heading', { level: 1, name: 'Rosa Quispe Mamani' })).toBeVisible()

  await page.goto('/certificados/NO-EXISTE')
  await expect(page.getByRole('heading', { level: 1, name: 'No hay ningún certificado con ese código' })).toBeVisible()
  expect(api.unexpected).toEqual([])
})
