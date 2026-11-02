import type { Page } from '@playwright/test'
import { draftDetail, draftVersion, publishedDetail, publishedVersion } from '../../../src/modules/studio/test/fixtures'
import { doneJob, failedJob, IMPORT_JOB_ID, importReport, pendingJob, runningJob, ANY_SHA, SOURCE } from '../../../src/modules/studio/test/importFixtures'
import { creator, type Scenario } from '../scenario'

const DRAFT = 'a1b2c3d4-0000-4000-8000-000000000002'
const DRAFT_PATH = `/estudio/versiones/${DRAFT}`
const DIFF = `**/api/lms/studio/versions/${DRAFT}/diff`

const LONG = 'Procedimiento administrativo de liquidación de contribuciones municipales con un título larguísimo'
const LONG_WORD = 'Anticonstitucionalísimamente-'.repeat(4)

// una comparación con todo: añadido, quitado, cambiado de título y de otros campos, sin cambios y títulos muy largos
export const fullDiff = {
  baseVersion: 1,
  units: [
    {
      order: 1,
      change: 'CHANGED',
      title: 'Primeros pasos en el portal',
      previousTitle: 'Comenzar',
      fields: ['descripcion', 'titulo'],
      lessons: [
        { order: 1, change: 'SAME', title: 'Entrar al portal', previousTitle: 'Entrar al portal', fields: [] },
        { order: 2, change: 'CHANGED', title: 'Cambiar la clave', previousTitle: 'Cambiar la clave', fields: ['recursos', 'resumen', 'video_url'] },
        { order: 3, change: 'ADDED', title: 'Recorrido por el portal', previousTitle: null, fields: [] },
        { order: 4, change: 'REMOVED', title: null, previousTitle: 'Preguntas frecuentes', fields: [] },
        { order: 5, change: 'CHANGED', title: LONG, previousTitle: `${LONG} anterior`, fields: ['criterios_aceptacion', 'titulo'] }
      ]
    },
    {
      order: 2,
      change: 'CHANGED',
      title: 'Liquidaciones',
      previousTitle: 'Liquidaciones',
      fields: [],
      lessons: [{ order: 1, change: 'CHANGED', title: LONG_WORD, previousTitle: LONG_WORD, fields: ['tipo'] }]
    },
    {
      order: 3,
      change: 'ADDED',
      title: 'Evaluación',
      previousTitle: null,
      fields: [],
      lessons: [{ order: 1, change: 'ADDED', title: 'Examen final', previousTitle: null, fields: [] }]
    },
    {
      order: 4,
      change: 'REMOVED',
      title: null,
      previousTitle: 'Anexos',
      fields: [],
      lessons: [{ order: 1, change: 'REMOVED', title: null, previousTitle: 'Glosario', fields: [] }]
    },
    { order: 5, change: 'SAME', title: 'Cierre', previousTitle: 'Cierre', fields: [], lessons: [] }
  ]
}

const sameDiff = { baseVersion: 1, units: [{ order: 1, change: 'SAME', title: 'Primeros pasos', previousTitle: 'Primeros pasos', fields: [], lessons: [] }] }

// una ventana alta (main desplaza, la captura no) y la comparación arriba
async function showDiff(page: Page): Promise<void> {
  const viewport = page.viewportSize()!
  await page.setViewportSize({ width: viewport.width, height: 1800 })
  await page.getByRole('region', { name: /^(Cambios|Changes)$/ }).evaluate((section) => section.scrollIntoView({ block: 'start' }))
}

const VERSIONS = '**/api/lms/studio/versions'
const DETAIL = `**/api/lms/studio/versions/${DRAFT}`

const reloadedWith = (url: string, status: number, body: unknown) => async (page: Page) => {
  await page.route(url, (route) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }))
  await page.reload({ waitUntil: 'networkidle' })
}

// varios cursos en todos los estados, con títulos largos: el orden por lo que requiere acción y una sola primaria
const otherCourse = { id: 'c-otro', code: 'SRTM-200', title: LONG }
const manyVersions = [
  { ...publishedVersion, id: 'p-3', number: 3, course: { id: 'c-3', code: 'CIERRE-300', title: 'Cierre del ejercicio fiscal' } },
  {
    ...publishedVersion,
    id: 'r-1',
    number: 2,
    status: 'RETIRADA',
    openComments: 0,
    course: { id: 'c-3', code: 'CIERRE-300', title: 'Cierre del ejercicio fiscal' }
  },
  { ...draftVersion, id: 'a-1', number: 4, status: 'APROBADA', course: otherCourse },
  { ...draftVersion, id: 'e-1', number: 5, status: 'EN_REVISION', openComments: 2, course: otherCourse },
  { ...draftVersion, openComments: 3 },
  publishedVersion
]

// un borrador devuelto: comentarios en cada sitio, decisiones y títulos largos
const returned = {
  ...draftDetail,
  units: draftDetail.units.map((unit) => (unit.order === 2 ? { ...unit, title: LONG } : unit)),
  comments: [
    ...publishedDetail.comments,
    {
      id: 'c-v',
      section: 'version',
      text: 'Revisa el enfoque general antes de volver a enviarla.',
      authorId: null,
      createdAt: '2026-08-22T09:30:00Z',
      resolved: false
    },
    { id: 'c-u', section: 'unidad:1', text: 'Esta unidad es larga: valora dividirla.', authorId: null, createdAt: '2026-08-22T09:40:00Z', resolved: false },
    { id: 'c-o', section: 'unidad:9/leccion:9', text: 'Esta lección sobraba.', authorId: null, createdAt: '2026-08-20T09:40:00Z', resolved: true }
  ],
  decisions: [publishedDetail.decisions[0]]
}

const IMPORT_PATH = '/estudio/importar'
const IMPORT_SOURCES = '**/api/lms/studio/import/sources'
const IMPORT = '**/api/lms/studio/import'
const importJob = `**/api/lms/studio/import/${IMPORT_JOB_ID}`

// rellena el formulario, en español o en inglés
async function fillImport(page: Page, path = 'manual/maestro.adoc'): Promise<void> {
  await page.getByLabel('Commit').fill(ANY_SHA)
  await page.getByLabel(/Ruta del maestro|Master file path/).fill(path)
  await page.getByRole('combobox', { name: /^(Curso|Course)$/ }).click()
  await page.getByRole('option').first().click()
}

const submitImport = (page: Page) => page.getByRole('button', { name: /Importar como borrador|Import as a draft/ }).click()

// el trabajo en el estado que se quiere ver, y una ventana alta para ver el informe entero
const importedAs = (job: unknown) => async (page: Page) => {
  await page.route(IMPORT, (route) => (route.request().method() === 'POST' ? route.fulfill({ status: 202, json: pendingJob }) : route.fallback()))
  await page.route(importJob, (route) => route.fulfill({ json: job }))
  await fillImport(page)
  await submitImport(page)
  await page.getByRole('heading', { level: 2, name: /Estado de la importación|Import status/ }).waitFor()
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 1500 })
  await page.waitForTimeout(100)
}

// un informe con todas las gravedades, recortado y con rutas larguísimas
const severeReport = {
  ...importReport,
  problemCount: 812,
  problems: [
    ...importReport.problems,
    {
      kind: 'FILE_TOO_LARGE',
      origin: `wasichai/manual-sgspe@${ANY_SHA}:manual/${'capitulo-muy-largo/'.repeat(6)}anexo.adoc`,
      line: 0,
      detail: 'manual/anexo.adoc'
    },
    { kind: 'INCLUDE_CYCLE', origin: `wasichai/manual-sgspe@${ANY_SHA}:manual/a.adoc`, line: 3, detail: 'manual/a.adoc -> manual/b.adoc -> manual/a.adoc' },
    { kind: 'BROKEN_REFERENCE', origin: `wasichai/manual-sgspe@${ANY_SHA}:manual/pagos.adoc`, line: 44, detail: 'seccion-inexistente' },
    { kind: 'UNRESOLVED_ATTRIBUTE', origin: `wasichai/manual-sgspe@${ANY_SHA}:manual/a.adoc`, line: 9, detail: `{${'atributo-sin-valor-'.repeat(8)}}` }
  ]
}

const withDiff = (status: number, body: unknown) => async (page: Page) => {
  await page.route(DIFF, (route) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }))
  await page.reload({ waitUntil: 'networkidle' })
  await showDiff(page)
}

export const studioScenarios: Scenario[] = [
  { name: 'studio', path: '/estudio', api: creator },
  { name: 'studio-draft', path: DRAFT_PATH, api: creator },
  {
    name: 'studio-published',
    path: '/estudio/versiones/a1b2c3d4-0000-4000-8000-000000000001',
    api: creator,
    act: async (page) => {
      await page.setViewportSize({ width: page.viewportSize()!.width, height: 1500 })
    }
  },
  { name: 'studio-import', path: IMPORT_PATH, api: creator },
  {
    name: 'studio-import-invalid',
    path: IMPORT_PATH,
    api: creator,
    act: async (page) => {
      await page.getByLabel('Commit').fill('4f2a9c1')
      await page.getByLabel(/Ruta del maestro|Master file path/).fill('../secreto.adoc')
      await submitImport(page)
    }
  },
  {
    name: 'studio-import-refused',
    path: IMPORT_PATH,
    api: creator,
    act: async (page) => {
      await page.route(IMPORT, (route) =>
        route.request().method() === 'POST' ? route.fulfill({ status: 403, json: { title: 'Forbidden', status: 403 } }) : route.fallback()
      )
      await fillImport(page)
      await submitImport(page)
      await page.getByRole('alert').waitFor()
      await page.setViewportSize({ width: page.viewportSize()!.width, height: 1300 })
    }
  },
  { name: 'studio-import-pending', path: IMPORT_PATH, api: creator, act: importedAs(pendingJob) },
  { name: 'studio-import-running', path: IMPORT_PATH, api: creator, act: importedAs({ ...runningJob, error: 'GitHub respondió 502' }) },
  { name: 'studio-import-done', path: IMPORT_PATH, api: creator, act: importedAs(doneJob) },
  { name: 'studio-import-severe', path: IMPORT_PATH, api: creator, act: importedAs({ ...doneJob, report: severeReport }) },
  {
    name: 'studio-import-clean',
    path: IMPORT_PATH,
    api: creator,
    act: importedAs({ ...doneJob, report: { ...importReport, source: SOURCE, problemCount: 0, problems: [] } })
  },
  { name: 'studio-import-failed', path: IMPORT_PATH, api: creator, act: importedAs(failedJob) },
  { name: 'studio-import-forbidden', path: IMPORT_PATH, api: creator, act: reloadedWith(IMPORT_SOURCES, 403, { title: 'Forbidden', status: 403 }) },
  { name: 'studio-import-no-sources', path: IMPORT_PATH, api: creator, act: reloadedWith(IMPORT_SOURCES, 200, []) },
  {
    name: 'studio-import-loading',
    path: IMPORT_PATH,
    api: creator,
    act: async (page) => {
      await page.route(IMPORT_SOURCES, () => {})
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.getByText(/Cargando los orígenes|Loading the allowed/).waitFor()
    }
  },
  { name: 'studio-many', path: '/estudio', api: creator, act: reloadedWith(VERSIONS, 200, manyVersions) },
  { name: 'studio-empty', path: '/estudio', api: creator, act: reloadedWith(VERSIONS, 200, []) },
  { name: 'studio-error', path: '/estudio', api: creator, act: reloadedWith(VERSIONS, 500, { title: 'Internal Server Error', status: 500 }) },
  {
    name: 'studio-loading',
    path: '/estudio',
    api: creator,
    act: async (page) => {
      await page.route(VERSIONS, () => {})
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.getByText(/Cargando tus versiones|Loading your versions/).waitFor()
    }
  },
  {
    name: 'studio-returned',
    path: DRAFT_PATH,
    api: creator,
    act: async (page) => {
      await reloadedWith(DETAIL, 200, returned)(page)
      await page.setViewportSize({ width: page.viewportSize()!.width, height: 2000 })
    }
  },
  {
    name: 'studio-in-review',
    path: DRAFT_PATH,
    api: creator,
    act: async (page) => {
      await reloadedWith(DETAIL, 200, { ...draftDetail, status: 'EN_REVISION' })(page)
    }
  },
  { name: 'studio-not-found', path: '/estudio/versiones/de-otra-persona', api: creator },
  { name: 'studio-version-error', path: DRAFT_PATH, api: creator, act: reloadedWith(DETAIL, 500, { title: 'Internal Server Error', status: 500 }) },
  { name: 'studio-diff', path: DRAFT_PATH, api: creator, act: withDiff(200, fullDiff) },
  { name: 'studio-diff-none', path: DRAFT_PATH, api: creator, act: withDiff(200, sameDiff) },
  { name: 'studio-diff-first', path: '/estudio/versiones/a1b2c3d4-0000-4000-8000-000000000001', api: creator, act: showDiff },
  { name: 'studio-diff-error', path: DRAFT_PATH, api: creator, act: withDiff(500, { title: 'Internal Server Error', status: 500 }) },
  {
    name: 'studio-diff-loading',
    path: DRAFT_PATH,
    api: creator,
    act: async (page) => {
      // la respuesta no llega nunca: se queda cargando
      await page.route(DIFF, () => {})
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page
        .getByRole('status')
        .filter({ hasText: /Comparando|Comparing/ })
        .waitFor()
      await showDiff(page)
    }
  }
]
