import type { Page } from '@playwright/test'
import { otherVersionInReview, versionDetail, versionInReview } from '../../../src/modules/review/test/fixtures'
import { reviewer, type Scenario } from '../scenario'

const VERSION = 'ver-sgspe-2'
const INBOX_API = '**/api/lms/review/versions'
const VERSION_API = `**/api/lms/review/versions/${VERSION}`
const PATH = `/revision/${VERSION}`
const LONG = 'Procedimiento administrativo de liquidación de contribuciones municipales con un título larguísimo'

const reloadedWith = (url: string, status: number, body: unknown) => async (page: Page) => {
  await page.route(url, (route) => route.fulfill({ status, json: body }))
  await page.reload({ waitUntil: 'networkidle' })
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 1800 })
}

// muchos comentarios, en cada sitio y estado, con títulos largos y decisiones
const busy = {
  ...versionDetail,
  course: { ...versionDetail.course, title: LONG },
  openComments: 3,
  units: versionDetail.units.map((unit) => ({
    ...unit,
    title: LONG,
    lessons: unit.lessons.map((lesson, index) => (index === 0 ? { ...lesson, sourceRef: 'wasichai/manual-sgspe@4f2a9c1:acceso.adoc#entrar' } : lesson))
  })),
  comments: [
    ...versionDetail.comments,
    { id: 'c-u', section: 'unidad:1', text: 'La unidad es muy larga: valora dividirla.', authorId: null, createdAt: '2026-10-22T12:00:00Z', resolved: false },
    { id: 'c-r', section: 'unidad:1/leccion:1', text: 'Ya está la cita.', authorId: null, createdAt: '2026-10-20T12:00:00Z', resolved: true },
    { id: 'c-v', section: 'version', text: 'El título general va bien.'.repeat(6), authorId: null, createdAt: '2026-10-20T12:00:00Z', resolved: false },
    { id: 'c-o', section: 'unidad:9/leccion:9', text: 'Esta lección sobraba.', authorId: null, createdAt: '2026-10-20T12:00:00Z', resolved: true }
  ],
  decisions: [
    ...versionDetail.decisions,
    { decision: 'PEDIR_CAMBIOS', reason: 'Sigue faltando la ordenanza.', authorId: 'u-revisor', at: '2026-10-19T12:00:00Z' }
  ]
}

export const reviewScenarios: Scenario[] = [
  { name: 'review-inbox', path: '/revision', api: reviewer },
  {
    name: 'review-inbox-many',
    path: '/revision',
    api: reviewer,
    act: reloadedWith(INBOX_API, 200, [
      versionInReview,
      otherVersionInReview,
      {
        ...versionInReview,
        id: 'v-3',
        course: { ...versionInReview.course, id: 'c-3', title: LONG, code: 'LARGO-300' },
        openComments: 12,
        reviewerId: 'u-revisor'
      }
    ])
  },
  { name: 'review-inbox-empty', path: '/revision', api: reviewer, act: reloadedWith(INBOX_API, 200, []) },
  { name: 'review-inbox-error', path: '/revision', api: reviewer, act: reloadedWith(INBOX_API, 500, { title: 'Internal Server Error', status: 500 }) },
  {
    name: 'review-inbox-loading',
    path: '/revision',
    api: reviewer,
    act: async (page) => {
      await page.route(INBOX_API, () => {})
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.getByText(/Cargando la bandeja|Loading the inbox/).waitFor()
    }
  },
  {
    name: 'review-version',
    path: PATH,
    api: reviewer,
    act: async (page) => {
      await page.setViewportSize({ width: page.viewportSize()!.width, height: 1800 })
    }
  },
  { name: 'review-busy', path: PATH, api: reviewer, act: reloadedWith(VERSION_API, 200, busy) },
  {
    name: 'review-reject',
    path: PATH,
    api: reviewer,
    act: async (page) => {
      await page.getByRole('button', { name: /^(Rechazar|Reject)$/ }).click()
      await page.getByRole('dialog').waitFor()
    }
  },
  {
    name: 'review-unsent',
    path: PATH,
    api: reviewer,
    act: async (page) => {
      await page.setViewportSize({ width: page.viewportSize()!.width, height: 1800 })
      await page.getByRole('button', { name: /^(Comentar La versión completa|Comment on The whole version)$/ }).click()
      await page.getByRole('form').getByRole('textbox').fill('Una idea a medias')
    }
  },
  { name: 'review-approved', path: PATH, api: reviewer, act: reloadedWith(VERSION_API, 200, { ...versionDetail, status: 'APROBADA' }) },
  {
    name: 'review-publish',
    path: PATH,
    api: reviewer,
    act: async (page) => {
      // quien tiene PUBLICAR: la simulación de la cuenta del revisor no lo trae
      await page.route('**/api/auth/me/permissions', (route) =>
        route.fulfill({ json: { admin: false, objects: { version_curso: ['READ', 'APROBAR', 'PUBLICAR'] } } })
      )
      await reloadedWith(VERSION_API, 200, { ...versionDetail, status: 'APROBADA' })(page)
    }
  },
  { name: 'review-retired', path: PATH, api: reviewer, act: reloadedWith(VERSION_API, 200, { ...versionDetail, status: 'RETIRADA' }) },
  { name: 'review-not-found', path: '/revision/de-otra-persona', api: reviewer },
  { name: 'review-error', path: PATH, api: reviewer, act: reloadedWith(VERSION_API, 500, { title: 'Internal Server Error', status: 500 }) }
]
