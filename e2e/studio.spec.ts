import { expect, test } from '@playwright/test'
import { fakeApi } from './api'

// el estudio del creador (ADR-0018) con la API simulada: sus versiones, enviar un borrador a revisión y crear una versión
// nueva a partir de la publicada

const DRAFT = 'a1b2c3d4-0000-4000-8000-000000000002'
const PUBLISHED = 'a1b2c3d4-0000-4000-8000-000000000001'
const CREATED = 'a1b2c3d4-0000-4000-8000-000000000003'
const IMPORT_SHA = '0123456789abcdef0123456789abcdef01234567'
const IMPORT_SOURCE = `wasichai/manual-sgspe@${IMPORT_SHA}:manual/maestro.adoc`

test('un creador encuentra «Mis versiones» en el menú y envía su borrador a revisión', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, as: 'creator' })
  await page.goto('/')

  await page.getByRole('link', { name: 'Mis versiones' }).click()
  await expect(page).toHaveURL('/estudio')
  await expect(page.getByRole('heading', { level: 1, name: 'Mis versiones' })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(2)
  const published = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Introducción al SGSPE — versión 1' }) })
  await expect(published).toContainText('Publicada')
  await expect(published).toContainText('1 comentario por atender')
  await page.getByRole('link', { name: 'Introducción al SGSPE — versión 2' }).click()

  await expect(page).toHaveURL(`/estudio/versiones/${DRAFT}`)
  await expect(page.getByRole('heading', { level: 2, name: 'Estado: Borrador' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Editar la versión' })).toHaveAttribute('href', `/data/objects/version_curso/records/${DRAFT}`)
  await expect(page.getByRole('link', { name: 'Editar la lección «Entrar al portal»' })).toHaveAttribute('href', '/data/objects/leccion/records/l-1')
  await page.getByRole('button', { name: 'Enviar a revisión' }).click()
  await page.getByRole('dialog', { name: '¿Enviar a revisión?' }).getByRole('button', { name: 'Sí, enviar a revisión' }).click()

  await expect(page.getByRole('status').filter({ hasText: 'Enviada a revisión.' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Estado: En revisión' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar a revisión' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Editar la versión' })).toHaveCount(0)
  // lo guardó el servidor: sigue en revisión al recargar y en la lista
  await page.reload()
  await expect(page.getByRole('heading', { level: 2, name: 'Estado: En revisión' })).toBeVisible()
  await page.getByRole('link', { name: '← Mis versiones' }).click()
  await expect(page.getByRole('article').first()).toContainText('En revisión')
  expect(api.studioRequests).toContain(`POST /api/lms/studio/versions/${DRAFT}/submit`)
  expect(api.unexpected).toEqual([])
})

test('a partir de la versión publicada se crea un borrador nuevo, sin sus comentarios ni sus decisiones', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, as: 'creator' })
  await page.goto(`/estudio/versiones/${PUBLISHED}`)

  await expect(page.getByRole('heading', { level: 2, name: 'Estado: Publicada' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Comentarios de revisión' })).toContainText('La evaluación pide algo que la unidad no enseña.')
  await expect(page.getByRole('region', { name: 'Decisiones del revisor' })).toContainText('Faltan ejemplos en la unidad 2.')
  await page.getByRole('button', { name: 'Crear una versión nueva a partir de esta' }).click()
  await page.getByRole('dialog', { name: '¿Crear una versión nueva?' }).getByRole('button', { name: 'Sí, crear el borrador' }).click()

  await expect(page).toHaveURL(`/estudio/versiones/${CREATED}`)
  await expect(page.getByText('Versión 3 · SGSPE-101')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Estado: Borrador' })).toBeVisible()
  await expect(page.getByText('El revisor no ha dejado comentarios.')).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Unidad 1. Primeros pasos' })).toBeVisible()
  await page.getByRole('link', { name: '← Mis versiones' }).click()
  await expect(page.getByRole('article')).toHaveCount(3)
  expect(api.studioRequests).toContain(`POST /api/lms/studio/courses/c0a8e1f2-0000-4000-8000-0000000000aa/versions`)
  expect(api.unexpected).toEqual([])
})

test('un estudiante no ve «Contenido» en el menú', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/')

  await expect(page.getByRole('link', { name: 'Mis cursos' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Mis versiones' })).toHaveCount(0)
})

test('una versión ajena se explica: solo se ven las propias', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'creator' })
  await page.goto('/estudio/versiones/de-otra-persona')

  await expect(page.getByRole('alert')).toContainText('Esta versión no está entre las tuyas')
  await page.getByRole('link', { name: '← Mis versiones' }).click()
  await expect(page).toHaveURL('/estudio')
})

test('un creador importa un manual: encola, sigue el trabajo, lee el informe y abre el borrador', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, as: 'creator' })
  await page.goto('/estudio')

  await page.getByRole('link', { name: 'Importar desde un repositorio' }).click()
  await expect(page).toHaveURL('/estudio/importar')
  await expect(page.getByRole('heading', { level: 1, name: 'Importar un manual' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Orígenes permitidos' })).toContainText('wasichai/manual-sgspe')
  await page.getByLabel('Commit').fill(IMPORT_SHA)
  await page.getByLabel('Ruta del maestro').fill('manual/maestro.adoc')
  await page.getByRole('combobox', { name: 'Curso' }).click()
  await page.getByRole('option', { name: 'Introducción al SGSPE (SGSPE-101)' }).click()
  await expect(page.getByText(`Se importará ${IMPORT_SOURCE}`)).toBeVisible()
  await page.getByRole('button', { name: 'Importar como borrador' }).click()

  // el sondeo es cada pocos segundos: PENDIENTE, EN_CURSO y HECHO
  await expect(page.getByRole('heading', { level: 2, name: 'Estado de la importación' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Importación terminada' })).toBeVisible({ timeout: 15_000 })
  const report = page.getByRole('region', { name: 'Informe' })
  await expect(report.getByRole('heading', { level: 3 })).toHaveText(['Inclusión que no existe (1)', 'Imagen que no existe (2)'])
  await page.getByRole('link', { name: 'Abrir el borrador' }).click()

  await expect(page).toHaveURL(`/estudio/versiones/${CREATED}`)
  await expect(page.getByRole('heading', { level: 2, name: 'Estado: Borrador' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Unidad 1. Acceso al portal' })).toBeVisible()
  await expect(page.getByText(`Fuente: ${IMPORT_SOURCE}#entrar`)).toBeVisible()
  await page.getByRole('link', { name: '← Mis versiones' }).click()
  await expect(page.getByRole('article')).toHaveCount(3)
  expect(api.studioRequests).toContain('POST /api/lms/studio/import')
  expect(api.unexpected).toEqual([])
})

test('si el servidor no permite el origen (403), la importación lo explica', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, as: 'creator' })
  api.failOnce((url, method) => method === 'POST' && url.pathname === '/api/lms/studio/import', 403, 'Origen no permitido')
  await page.goto('/estudio/importar')

  await page.getByLabel('Commit').fill(IMPORT_SHA)
  await page.getByLabel('Ruta del maestro').fill('manual/maestro.adoc')
  await page.getByRole('combobox', { name: 'Curso' }).click()
  await page.getByRole('option', { name: 'Administración tributaria municipal (SRTM-201)' }).click()
  await page.getByRole('button', { name: 'Importar como borrador' }).click()

  await expect(page.getByRole('alert')).toContainText('no están entre los orígenes permitidos')
  await expect(page.getByRole('button', { name: 'Importar como borrador' })).toBeEnabled()
})

test('a quien no puede importar (403), la página de importación se lo explica', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  api.failOnce((url) => url.pathname === '/api/lms/studio/import/sources', 403, 'Forbidden')
  await page.goto('/estudio/importar')

  await expect(page.getByRole('alert')).toContainText('No puedes importar manuales')
  await expect(page.getByLabel('Commit')).toHaveCount(0)
})
