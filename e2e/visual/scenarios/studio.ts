import type { Page } from '@playwright/test'
import {
  draftDetail,
  draftVersion,
  firstDraftDetail,
  lessonDefinition,
  newCourseRecord,
  noLessonsDetail,
  publishedDetail,
  publishedVersion
} from '../../../src/modules/studio/test/fixtures'
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
      detail: 'manual/anexo.adoc',
      severity: 'GAP'
    },
    {
      kind: 'INCLUDE_CYCLE',
      origin: `wasichai/manual-sgspe@${ANY_SHA}:manual/a.adoc`,
      line: 3,
      detail: 'manual/a.adoc -> manual/b.adoc -> manual/a.adoc',
      severity: 'GAP'
    },
    { kind: 'BROKEN_REFERENCE', origin: `wasichai/manual-sgspe@${ANY_SHA}:manual/pagos.adoc`, line: 44, detail: 'seccion-inexistente', severity: 'CHECK' },
    {
      kind: 'UNRESOLVED_ATTRIBUTE',
      origin: `wasichai/manual-sgspe@${ANY_SHA}:manual/a.adoc`,
      line: 9,
      detail: `{${'atributo-sin-valor-'.repeat(8)}}`,
      severity: 'GAP'
    }
  ],
  problemsBySeverity: { GAP: 304, CHECK: 508 }
}

// la pantalla al volver a ella, con la lista de trabajos que se quiere ver y una ventana alta para ver también el formulario
const withImportJobs = (status: number, body: unknown) => async (page: Page) => {
  await page.route(IMPORT, (route) =>
    route.request().method() === 'GET' ? route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }) : route.fallback()
  )
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('heading', { level: 2, name: /Tus importaciones|Your imports/ }).waitFor()
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 1500 })
}

const finishedJob = (index: number) => ({ ...doneJob, id: `job-${index}`, versionId: `version-${index}` })
const jobsOfEveryKind = [runningJob, doneJob, { ...failedJob, id: 'job-failed' }, finishedJob(1), finishedJob(2), finishedJob(3)]
// un curso que no está entre los legibles y una ruta larguísima: se nombra por su archivo, y no se desborda
const jobsWithLongSource = [{ ...doneJob, courseId: 'otro', source: `wasichai/manual-sgspe@${ANY_SHA}:manual/${'capitulo-muy-largo/'.repeat(6)}anexo.adoc` }]

const withDiff = (status: number, body: unknown) => async (page: Page) => {
  await page.route(DIFF, (route) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }))
  await page.reload({ waitUntil: 'networkidle' })
  await showDiff(page)
}

const NEW_COURSE_PATH = '/estudio/cursos/nuevo'
const FIRST_DRAFT = `**/api/lms/studio/courses/${newCourseRecord.id}/versions`

// el formulario de «Nuevo curso» guardado, con el borrador en la respuesta que se quiere ver
const savedWithDraftReply = (status: number) => async (page: Page) => {
  await page.route(FIRST_DRAFT, (route) => route.fulfill({ status, contentType: 'application/problem+json', body: JSON.stringify({ title: 'Error', status }) }))
  await page.getByLabel(/Código|Code/).fill('NUEVO-101')
  await page.getByLabel(/Identificador|URL/).fill('nuevo-101')
  await page.getByLabel(/Título|Title/).fill('Curso nuevo')
  await page.getByRole('button', { name: /Guardar|Save/ }).click()
  await page.getByRole('alert').waitFor()
}

// el primer borrador, recién creado y sin unidades
const firstDraftOpen = async (page: Page) => {
  await page.getByLabel(/Código|Code/).fill('NUEVO-101')
  await page.getByLabel(/Identificador|URL/).fill('nuevo-101')
  await page.getByLabel(/Título|Title/).fill('Curso nuevo')
  await page.getByRole('button', { name: /Guardar|Save/ }).click()
  await page.getByRole('link', { name: /Añadir la primera unidad|Add the first unit/ }).waitFor()
}

// la lista con un primer borrador, recién creado, sin unidades; su detalle dice que está vacío
const withEmptyDraftListed = async (page: Page) => {
  const { units: _units, comments: _comments, decisions: _decisions, ...summary } = firstDraftDetail
  await page.route(VERSIONS, (route) => route.fulfill({ json: [summary, publishedVersion] }))
  await page.route(`**/api/lms/studio/versions/${firstDraftDetail.id}`, (route) => route.fulfill({ json: firstDraftDetail }))
  await page.reload({ waitUntil: 'networkidle' })
}

// el servidor rechaza con un 409, sea cual sea su causa, y lo que se relee después es lo que decide el mensaje
const rejected = (reread: unknown, status: number) => async (page: Page) => {
  await page.getByRole('button', { name: /Enviar a revisión|Send for review/ }).click()
  const confirm = page.getByRole('dialog').getByRole('button', { name: /Sí, enviar a revisión|Yes, send for review/ })
  await confirm.waitFor()
  await page.route(`${DETAIL}`, (route) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(reread) }))
  await page.route(`${DETAIL}/submit`, (route) => route.fulfill({ status: 409, json: { title: 'Conflict', status: 409, detail: 'no es contrato' } }))
  await confirm.click()
  await page.getByRole('dialog').getByRole('alert').waitFor()
}

export const studioScenarios: Scenario[] = [
  { name: 'studio', path: '/estudio', api: creator },
  { name: 'studio-new-course', path: NEW_COURSE_PATH, api: creator },
  { name: 'studio-new-course-network', path: NEW_COURSE_PATH, api: creator, act: savedWithDraftReply(500) },
  { name: 'studio-new-course-refused', path: NEW_COURSE_PATH, api: creator, act: savedWithDraftReply(403) },
  { name: 'studio-new-course-conflict', path: NEW_COURSE_PATH, api: creator, act: savedWithDraftReply(409) },
  { name: 'studio-first-draft', path: NEW_COURSE_PATH, api: creator, act: firstDraftOpen },
  {
    name: 'studio-no-lessons',
    path: DRAFT_PATH,
    api: creator,
    act: async (page) => {
      await reloadedWith(DETAIL, 200, { ...noLessonsDetail, id: DRAFT })(page)
      await page.setViewportSize({ width: page.viewportSize()!.width, height: 1800 })
    }
  },
  // «Mis versiones» no sabe cuántas lecciones tiene: lo comprueba al pedir enviar, por eso primero se ve el borrador con su acción
  { name: 'studio-list-empty-draft', path: '/estudio', api: creator, act: withEmptyDraftListed },
  {
    name: 'studio-list-empty-draft-dialog',
    path: '/estudio',
    api: creator,
    act: async (page) => {
      await withEmptyDraftListed(page)
      await page.getByRole('button', { name: /(Enviar a revisión la versión 1|Send version 1)/ }).click()
      await page
        .getByRole('dialog')
        .getByRole('button', { name: /Añadir la primera unidad|Add the first unit/ })
        .waitFor()
    }
  },
  { name: 'studio-rejected-no-lessons', path: DRAFT_PATH, api: creator, act: rejected({ ...draftDetail, units: [] }, 200) },
  { name: 'studio-rejected-state', path: DRAFT_PATH, api: creator, act: rejected(draftDetail, 200) },
  { name: 'studio-rejected-not-draft', path: DRAFT_PATH, api: creator, act: rejected({ ...draftDetail, status: 'EN_REVISION' }, 200) },
  { name: 'studio-rejected-unknown', path: DRAFT_PATH, api: creator, act: rejected({ title: 'Error', status: 500 }, 500) },
  {
    name: 'studio-new-lesson',
    path: `${DRAFT_PATH}/unidades/u-1/lecciones/nueva`,
    api: creator,
    act: reloadedWith('**/api/metadata/objects/leccion', 200, lessonDefinition)
  },
  { name: 'studio-new-unit', path: `${DRAFT_PATH}/unidades/nueva`, api: creator },
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
    act: importedAs({ ...doneJob, report: { ...importReport, source: SOURCE, problemCount: 0, problems: [], problemsBySeverity: { GAP: 0, CHECK: 0 } } })
  },
  { name: 'studio-import-failed', path: IMPORT_PATH, api: creator, act: importedAs(failedJob) },
  // quien vuelve: la lista de sus trabajos, en cada estado que importa
  { name: 'studio-import-jobs', path: IMPORT_PATH, api: creator, act: withImportJobs(200, jobsOfEveryKind) },
  { name: 'studio-import-jobs-running', path: IMPORT_PATH, api: creator, act: withImportJobs(200, [runningJob]) },
  { name: 'studio-import-jobs-long', path: IMPORT_PATH, api: creator, act: withImportJobs(200, jobsWithLongSource) },
  { name: 'studio-import-jobs-empty', path: IMPORT_PATH, api: creator, act: withImportJobs(200, []) },
  { name: 'studio-import-jobs-error', path: IMPORT_PATH, api: creator, act: withImportJobs(500, { title: 'Error', status: 500 }) },
  { name: 'studio-import-jobs-forbidden', path: IMPORT_PATH, api: creator, act: withImportJobs(403, { title: 'Forbidden', status: 403 }) },
  {
    name: 'studio-import-jobs-loading',
    path: IMPORT_PATH,
    api: creator,
    act: async (page) => {
      await page.route(IMPORT, (route) => (route.request().method() === 'GET' ? undefined : route.fallback()))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: /Importar como borrador|Import as a draft/ }).waitFor()
    }
  },
  {
    name: 'studio-import-jobs-resumed',
    path: IMPORT_PATH,
    api: creator,
    act: async (page) => {
      await page.route(importJob, (route) => route.fulfill({ json: runningJob }))
      await withImportJobs(200, [runningJob])(page)
      await page.getByRole('button', { name: /Seguir la importación|Follow the import/ }).click()
      await page.getByRole('heading', { level: 2, name: /Estado de la importación|Import status/ }).waitFor()
    }
  },
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
