import { expect, test } from '@playwright/test'
import { fakeApi } from './api'

// la bandeja del revisor (ADR-0018) con la API simulada: qué cambió, comentar por sección, pedir cambios con motivo y aprobar

test('un revisor abre su bandeja, ve qué cambió, comenta una lección y pide cambios con motivo', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, as: 'reviewer' })
  await page.goto('/')

  await page.getByRole('link', { name: 'Bandeja de revisión' }).click()
  await expect(page).toHaveURL('/revision')
  await expect(page.getByRole('heading', { level: 1, name: 'Bandeja de revisión' })).toBeVisible()
  const sgspe = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Introducción al SGSPE' }) })
  await expect(sgspe).toContainText('SGSPE-101 · versión 2')
  await expect(sgspe).toContainText('1 comentario abierto')
  await sgspe.getByRole('link', { name: 'Introducción al SGSPE' }).click()

  await expect(page).toHaveURL('/revision/ver-sgspe-2')
  await expect(page.getByRole('heading', { level: 1, name: 'Introducción al SGSPE' })).toBeVisible()
  // qué cambió respecto de la versión 1, antes del contenido
  const diff = page.getByRole('region', { name: 'Cambios', exact: true })
  await expect(diff).toContainText('Comparada con la versión 1.')
  await expect(diff).toContainText('CambiadaLección 1.1. Qué es el SGSPECambió: recursos, resumen')
  await expect(diff).toContainText('AñadidaLección 1.2. Evaluación de la unidad')
  await expect(diff).toContainText('QuitadaUnidad 2. Anexos')
  await page.getByRole('button', { name: 'Comentar Lección 1.2. Evaluación de la unidad' }).click()
  const form = page.getByRole('form', { name: 'Nuevo comentario sobre Lección 1.2. Evaluación de la unidad' })
  await form.getByRole('textbox', { name: 'Comentario' }).fill('Añade una pregunta sobre la ordenanza.')
  await form.getByRole('button', { name: 'Enviar comentario' }).click()
  await expect(page.getByRole('list', { name: 'Comentarios de Lección 1.2. Evaluación de la unidad' })).toContainText('Añade una pregunta sobre la ordenanza.')
  await expect(page.getByText('2 comentarios abiertos')).toBeVisible()

  await page.getByRole('button', { name: 'Pedir cambios' }).click()
  const dialog = page.getByRole('dialog', { name: '¿Pedir cambios?' })
  await dialog.getByRole('textbox').fill('Faltan las referencias a la ordenanza.')
  await dialog.getByRole('button', { name: 'Pedir cambios' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Cambios pedidos. Estado: Borrador.' })).toBeVisible()
  // ya no está en revisión: ni comentarios ni decisiones
  await expect(page.getByRole('button', { name: 'Aprobar' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Historial de decisiones' })).toContainText('Faltan las referencias a la ordenanza.')

  // y sale de la bandeja
  await page.getByRole('link', { name: '← Bandeja de revisión' }).click()
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('article')).toContainText('Licencias de anuncios con SRTM')
  expect(api.reviewRequests).toContain('POST /api/lms/review/versions/ver-sgspe-2/comments')
  expect(api.reviewRequests).toContain('POST /api/lms/review/versions/ver-sgspe-2/decision')
  expect(api.unexpected).toEqual([])
})

test('aprobar se confirma; sin PUBLICAR no se ofrece publicar; la primera versión de un curso es toda nueva', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'reviewer' })
  await page.goto('/revision/ver-srtm-1')

  await expect(page.getByRole('heading', { level: 1, name: 'Licencias de anuncios con SRTM' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Cambios', exact: true })).toContainText('Es la primera versión de este curso')
  await page.getByRole('button', { name: 'Aprobar' }).click()
  await page.getByRole('dialog', { name: '¿Aprobar esta versión?' }).getByRole('button', { name: 'Aprobar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Versión aprobada. Estado: Aprobada.' })).toBeVisible()
  await expect(page.getByText('Aprobada', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Publicar la versión' })).toHaveCount(0)
})

test('un estudiante no ve la bandeja en el menú, y una versión ajena se explica', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/')

  await expect(page.getByRole('link', { name: 'Mis cursos' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Bandeja de revisión' })).toHaveCount(0)

  await page.goto('/revision/version-de-otro')
  await expect(page.getByRole('alert')).toContainText('Esta versión no está a tu cargo')
})
