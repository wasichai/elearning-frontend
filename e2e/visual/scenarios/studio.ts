import type { Page } from '@playwright/test'
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

const withDiff = (status: number, body: unknown) => async (page: Page) => {
  await page.route(DIFF, (route) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }))
  await page.reload({ waitUntil: 'networkidle' })
  await showDiff(page)
}

export const studioScenarios: Scenario[] = [
  { name: 'studio', path: '/estudio', api: creator },
  { name: 'studio-draft', path: DRAFT_PATH, api: creator },
  { name: 'studio-published', path: '/estudio/versiones/a1b2c3d4-0000-4000-8000-000000000001', api: creator },
  { name: 'studio-import', path: '/estudio/importar', api: creator },
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
