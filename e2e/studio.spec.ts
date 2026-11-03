import { expect, test } from '@playwright/test'
import { fakeApi } from './api'
import { draftDetail, lessonDefinition } from '../src/modules/studio/test/fixtures'
import { failedJob } from '../src/modules/studio/test/importFixtures'
import { fullDiff } from './visual/scenarios/studio'

// el estudio del creador (ADR-0018) con la API simulada: sus versiones, qué cambió cada una respecto de la anterior,
// enviar un borrador a revisión y crear una versión nueva a partir de la publicada

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
  await expect(page.getByRole('link', { name: 'Nuevo curso' })).toHaveAttribute('href', '/estudio/cursos/nuevo')
  const published = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Introducción al SGSPE — versión 1' }) })
  await expect(published).toContainText('Publicada')
  await expect(published).toContainText('1 comentario por atender')
  await page.getByRole('link', { name: 'Introducción al SGSPE — versión 2' }).click()

  await expect(page).toHaveURL(`/estudio/versiones/${DRAFT}`)
  await expect(page.getByRole('heading', { level: 2, name: 'Estado: Borrador' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Editar la versión' })).toHaveAttribute('href', `/data/objects/version_curso/records/${DRAFT}`)
  await expect(page.getByRole('link', { name: 'Editar la lección «Entrar al portal»' })).toHaveAttribute('href', '/data/objects/leccion/records/l-1')
  // qué cambió respecto de la versión 1: la lección nueva y el título de la unidad 2; lo igual, plegado
  const diff = page.getByRole('region', { name: 'Cambios', exact: true })
  await expect(diff).toContainText('Comparada con la versión 1.')
  await expect(diff.getByRole('group', { name: 'Resumen de cambios' })).toContainText('Añadidas11 lección')
  await expect(diff.getByRole('list', { name: 'Leyenda' }).getByRole('listitem')).toHaveCount(3)
  await expect(diff.getByRole('deletion')).toHaveText('Liquidación')
  await expect(diff.getByRole('insertion')).toHaveText('Liquidaciones')
  await expect(diff).toContainText('AñadidaLección 1.2. Recorrido por el portal')
  await expect(diff).toContainText('CambiadaUnidad 2. LiquidacionesCambió: títuloAntes: LiquidaciónAhora: Liquidaciones')
  await expect(diff.getByText('1 lección sin cambios', { exact: true }).first()).toBeVisible()
  await expect(diff.getByText('Lección 2.1. Evaluación final')).toBeHidden()
  await page.getByRole('button', { name: 'Enviar a revisión' }).click()
  await page.getByRole('dialog', { name: '¿Enviar a revisión?' }).getByRole('button', { name: 'Sí, enviar a revisión' }).click()

  await expect(page.getByRole('status').filter({ hasText: 'Enviada a revisión.' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Estado: En revisión' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar a revisión' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Editar la versión' })).toHaveCount(0)
  // lo guardó el servidor: sigue en revisión al recargar y en la lista
  await page.reload()
  await expect(page.getByRole('heading', { level: 2, name: 'Estado: En revisión' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Mis versiones' }).click()
  await expect(page.getByRole('article').first()).toContainText('En revisión')
  expect(api.studioRequests).toContain(`POST /api/lms/studio/versions/${DRAFT}/submit`)
  expect(api.unexpected).toEqual([])
})

test('a partir de la versión publicada se crea un borrador nuevo, sin sus comentarios ni sus decisiones', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, as: 'creator' })
  await page.goto(`/estudio/versiones/${PUBLISHED}`)

  await expect(page.getByRole('heading', { level: 2, name: 'Estado: Publicada' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Cambios', exact: true })).toContainText('Es la primera versión de este curso')
  await expect(page.getByRole('region', { name: 'Comentarios de revisión' })).toContainText('1 comentario por atender')
  await expect(page.getByRole('list', { name: 'Comentarios de Evaluación final' })).toContainText('La evaluación pide algo que la unidad no enseña.')
  await expect(page.getByText('Solo lectura')).toBeVisible()
  await expect(page.getByRole('link', { name: /^Editar/ })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Decisiones del revisor' })).toContainText('Faltan ejemplos en la unidad 2.')
  await page.getByRole('button', { name: 'Crear versión nueva' }).click()
  await page.getByRole('dialog', { name: '¿Crear una versión nueva?' }).getByRole('button', { name: 'Sí, crear el borrador' }).click()

  await expect(page).toHaveURL(`/estudio/versiones/${CREATED}`)
  await expect(page.getByText('Versión 3 · SGSPE-101')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Estado: Borrador' })).toBeVisible()
  await expect(page.getByText('El revisor no ha dejado comentarios.')).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Unidad 1. Primeros pasos' })).toBeVisible()
  // la copia de la versión 1 se compara con la 2: le falta la lección que la 2 añadió
  const diff = page.getByRole('region', { name: 'Cambios', exact: true })
  await expect(diff).toContainText('Comparada con la versión 2.')
  await expect(diff).toContainText('QuitadaLección 1.2. Recorrido por el portal')
  await page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Mis versiones' }).click()
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
  await page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Mis versiones' }).click()
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
  await expect(page.getByRole('list', { name: 'Pasos de la importación' }).locator('[aria-current="step"]')).toContainText('Resultado')
  const report = page.getByRole('region', { name: 'Informe' })
  await expect(report.getByRole('heading', { level: 3 })).toHaveText(['Inclusión que no existe (1)', 'Imagen que no existe (2)'])
  await page.getByRole('link', { name: 'Abrir el borrador' }).click()

  await expect(page).toHaveURL(`/estudio/versiones/${CREATED}`)
  await expect(page.getByRole('heading', { level: 2, name: 'Estado: Borrador' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Unidad 1. Acceso al portal' })).toBeVisible()
  await page.getByText('Fuente técnica').first().click()
  await expect(page.getByText(`Fuente: ${IMPORT_SOURCE}#entrar`)).toBeVisible()
  await page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Mis versiones' }).click()
  await expect(page.getByRole('article')).toHaveCount(3)
  expect(api.studioRequests).toContain('POST /api/lms/studio/import')
  expect(api.unexpected).toEqual([])
})

test('quien sale de una importación en curso la retoma al volver a la pantalla', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, as: 'creator' })
  await page.goto('/estudio/importar')
  await expect(page.getByRole('region', { name: 'Tus importaciones' })).toContainText('Aún no tienes importaciones')

  await page.getByLabel('Commit').fill(IMPORT_SHA)
  await page.getByLabel('Ruta del maestro').fill('manual/maestro.adoc')
  await page.getByRole('combobox', { name: 'Curso' }).click()
  await page.getByRole('option', { name: 'Introducción al SGSPE (SGSPE-101)' }).click()
  await page.getByRole('button', { name: 'Importar como borrador' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Estado de la importación' })).toBeVisible()

  // recargar pierde el estado de la pantalla, no el trabajo
  await page.reload()
  const jobs = page.getByRole('region', { name: 'Tus importaciones' })
  await expect(jobs.getByRole('listitem')).toHaveCount(1)
  await jobs.getByRole('button', { name: /^Seguir la importación/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Importación terminada' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('region', { name: 'Informe' })).toBeVisible()
  expect(api.studioRequests.filter((request) => request === 'POST /api/lms/studio/import')).toHaveLength(1)
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

test('una importación fallida deja volver al formulario con lo escrito', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'creator' })
  await page.route('**/api/lms/studio/import', (route) =>
    route.request().method() === 'POST' ? route.fulfill({ status: 202, json: failedJob }) : route.fallback()
  )
  await page.route(`**/api/lms/studio/import/${failedJob.id}`, (route) => route.fulfill({ json: failedJob }))
  await page.goto('/estudio/importar')

  await page.getByLabel('Commit').fill(IMPORT_SHA)
  await page.getByLabel('Ruta del maestro').fill('manual/maestro.adoc')
  await page.getByRole('combobox', { name: 'Curso' }).click()
  await page.getByRole('option', { name: 'Introducción al SGSPE (SGSPE-101)' }).click()
  await page.getByRole('button', { name: 'Importar como borrador' }).click()

  await expect(page.getByRole('status').filter({ hasText: 'La importación falló' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('does not exist at this commit')
  await page.getByRole('button', { name: 'Revisar y reintentar' }).click()
  await expect(page.getByLabel('Commit')).toHaveValue(IMPORT_SHA)
  await expect(page.getByLabel('Ruta del maestro')).toHaveValue('manual/maestro.adoc')
  await expect(page.getByRole('combobox', { name: 'Curso' })).toContainText('Introducción al SGSPE (SGSPE-101)')
})

test('a quien no puede importar (403), la página de importación se lo explica', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  api.failOnce((url) => url.pathname === '/api/lms/studio/import/sources', 403, 'Forbidden')
  await page.goto('/estudio/importar')

  await expect(page.getByRole('alert')).toContainText('No puedes importar manuales')
  await expect(page.getByLabel('Commit')).toHaveCount(0)
})

test('la comparación no desborda a 360 con títulos muy largos y sus plegados se abren con el teclado', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await fakeApi(page, { signedIn: true, as: 'creator' })
  await page.route(`**/api/lms/studio/versions/${DRAFT}/diff`, (route) => route.fulfill({ json: fullDiff }))
  await page.goto(`/estudio/versiones/${DRAFT}`)

  const diff = page.getByRole('region', { name: 'Cambios', exact: true })
  await expect(diff.getByRole('group', { name: 'Resumen de cambios' })).toContainText('Cambiadas52 unidades y 3 lecciones')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  const sectionBox = (await diff.boundingBox())!
  expect(sectionBox.x + sectionBox.width).toBeLessThanOrEqual(360)

  const folded = diff.getByText('Lección 1.1. Entrar al portal')
  await expect(folded).toBeHidden()
  const summary = diff.locator('summary').filter({ hasText: '1 lección sin cambios' })
  expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(folded).toBeVisible()
})

test('de «Nuevo curso» al primer borrador vacío, a su primera unidad y a su primera lección: solo entonces se puede enviar', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, as: 'creator' })
  // la simulación de la plataforma da una lección con solo su título: aquí, los campos que el modelo exige
  await page.route('**/api/metadata/objects/leccion', (route) => route.fulfill({ json: lessonDefinition }))
  await page.goto('/estudio')

  await page.getByRole('link', { name: 'Nuevo curso' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Nuevo curso' })).toBeVisible()
  await page.getByLabel(/Código/).fill('NUEVO-101')
  await page.getByLabel(/Identificador/).fill('nuevo-101')
  await page.getByLabel(/Título/).fill('Curso nuevo')
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Curso nuevo' })).toBeVisible()
  await expect(page).toHaveURL(/\/estudio\/versiones\/[^/]+$/)
  await expect(page.getByText('Versión 1 · NUEVO-101')).toBeVisible()
  await expect(page.getByText(/aún no tiene unidades/)).toBeVisible()
  await expect(page.getByText('Aún no se puede enviar a revisión')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar a revisión' })).toHaveCount(0)

  await page.getByRole('link', { name: 'Añadir la primera unidad' }).click()
  await expect(page.getByLabel(/Orden/)).toHaveValue('1')
  await page.getByLabel(/Título/).fill('Primeros pasos')
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(page.getByRole('heading', { level: 3, name: 'Unidad 1. Primeros pasos' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Añadir la primera unidad' })).toHaveCount(0)
  // con una unidad sin lecciones sigue sin poder enviarse, y el camino lleva a una lección de esa unidad
  await expect(page.getByText(/Sus unidades aún no tienen lecciones/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar a revisión' })).toHaveCount(0)

  await page.getByRole('link', { name: 'Añadir la primera lección' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Nueva lección' })).toBeVisible()
  await expect(page.getByText('De la unidad 1. Primeros pasos')).toBeVisible()
  await expect(page.getByLabel(/Orden/)).toHaveValue('1')
  await expect(page.getByLabel(/^Unidad/)).toHaveCount(0)
  await page.getByLabel(/Título/).fill('Entrar al portal')
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(page.getByText('1. Entrar al portal', { exact: true })).toBeVisible()
  await expect(page.getByText('Aún no se puede enviar a revisión')).toHaveCount(0)
  await page.getByRole('button', { name: 'Enviar a revisión' }).click()
  await page.getByRole('dialog', { name: '¿Enviar a revisión?' }).getByRole('button', { name: 'Sí, enviar a revisión' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Enviada a revisión.' })).toBeVisible()
  expect(api.unexpected).toEqual([])
})

test('desde «Mis versiones», un borrador sin lecciones se comprueba al pedir enviar: se explica, no se envía y el foco vuelve', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, as: 'creator' })
  await page.goto('/estudio/cursos/nuevo')
  await page.getByLabel(/Código/).fill('NUEVO-101')
  await page.getByLabel(/Identificador/).fill('nuevo-101')
  await page.getByLabel(/Título/).fill('Curso nuevo')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Curso nuevo' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Mis versiones' }).click()

  const submit = page.getByRole('button', { name: 'Enviar a revisión la versión 1 de Curso nuevo' })
  await submit.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Aún no se puede enviar a revisión' })
  await expect(dialog).toContainText('no tiene lecciones')
  await expect(dialog.getByRole('button', { name: 'Sí, enviar a revisión' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(submit).toBeFocused()
  expect(api.studioRequests.filter((request) => request.endsWith('/submit'))).toEqual([])

  await submit.click()
  await page.getByRole('dialog').getByRole('button', { name: 'Añadir la primera unidad' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Nueva unidad' })).toBeVisible()
  expect(api.unexpected).toEqual([])
})

test('un 409 con la versión ya vaciada en otra pestaña se explica con lo que se relee: no se ve como enviada', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'creator' })
  await page.goto(`/estudio/versiones/${DRAFT}`)
  await page.getByRole('button', { name: 'Enviar a revisión' }).click()
  const confirm = page.getByRole('dialog', { name: '¿Enviar a revisión?' }).getByRole('button', { name: 'Sí, enviar a revisión' })
  await expect(confirm).toBeEnabled()

  // desde aquí, la versión no tiene lecciones: en otra pestaña se le quitaron
  await page.route(`**/api/lms/studio/versions/${DRAFT}`, (route) => route.fulfill({ json: { ...draftDetail, units: [] } }))
  await page.route(`**/api/lms/studio/versions/${DRAFT}/submit`, (route) =>
    route.fulfill({ status: 409, json: { title: 'Conflict', status: 409, detail: 'detail que no es contrato' } })
  )
  await confirm.click()

  const dialog = page.getByRole('dialog', { name: 'Aún no se puede enviar a revisión' })
  await expect(dialog.getByRole('alert')).toHaveText('El servidor no aceptó el envío: la versión 2 no tiene lecciones.')
  await expect(page.getByText('Enviada a revisión.')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Volver' }).click()
  await expect(page.getByRole('link', { name: 'Añadir la primera unidad' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar a revisión' })).toHaveCount(0)
  // el botón ya no está: el foco sigue en las acciones, y el siguiente Tab va a la primera
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Editar la versión' })).toBeFocused()
})
