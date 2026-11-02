import type { Page } from '@playwright/test'
import { offering, otherOffering, pendingAttempts, problem, teachingSessions } from '../../../src/modules/teaching/test/fixtures'
import { teacher, type Scenario } from '../scenario'

const OFFERING = '/docencia/edicion-sgspe-2026-09'
const OFFERINGS = '**/api/lms/teaching/offerings'

const failing = (page: Page, pattern: string) => page.route(pattern, (route) => route.fulfill({ status: 500, json: problem(500, 'fallo') }))

// fechas relativas a hoy, para que las capturas no caduquen
const fromNow = (days: number, hour = 13) => {
  const date = new Date(Date.now() + days * 86_400_000)
  date.setUTCHours(hour, 0, 0, 0)
  return date.toISOString().replace(/\.\d+Z$/, 'Z')
}
const later = (days: number, hour = 13) => fromNow(days, hour + 2)

const session = (id: string, title: string, days: number, overrides = {}) => ({
  ...teachingSessions[0]!,
  id,
  title,
  start: fromNow(days),
  end: later(days),
  ...overrides
})

// una carga real de trabajo: cuatro ediciones, dos con entregas, una por empezar y una terminada
const BUSY = [
  { ...offering, enrolled: 38, pendingAttempts: 7 },
  { ...otherOffering, status: 'EN_CURSO', enrolled: 24, pendingAttempts: 2 },
  {
    ...otherOffering,
    code: 'edicion-gestion-2027-01',
    status: 'PROGRAMADA',
    startDate: '2027-01-11',
    endDate: '2027-02-19',
    course: { slug: 'gestion-documental', code: 'GES-201', title: 'Gestión documental en la administración pública municipal' },
    enrolled: 0,
    pendingAttempts: 0
  },
  {
    ...otherOffering,
    code: 'edicion-sgspe-2026-03',
    status: 'FINALIZADA',
    startDate: '2026-03-02',
    endDate: '2026-04-10',
    course: { ...offering.course },
    enrolled: 31,
    pendingAttempts: 0
  }
]

const attempts = (count: number, lessonTitle: string, firstDays: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...pendingAttempts[0]!,
    attemptId: `int-${lessonTitle.length}-${index}`,
    email: `estudiante.${index + 1}@municipalidad.demo.local`,
    lessonTitle,
    submittedAt: fromNow(-(firstDays - index), 15)
  }))

async function busy(page: Page) {
  await page.route(OFFERINGS, (route) => route.fulfill({ json: BUSY }))
  await page.route(`${OFFERINGS}/${offering.code}/attempts`, (route) => route.fulfill({ json: attempts(7, 'Evaluación final', 9) }))
  await page.route(`${OFFERINGS}/${otherOffering.code}/attempts`, (route) =>
    route.fulfill({ json: attempts(2, 'Práctica calificada: cálculo de la licencia', 12) })
  )
  await page.route(`${OFFERINGS}/${offering.code}/sessions`, (route) =>
    route.fulfill({
      json: [
        session('s-1', 'Taller de liquidación', 0, {
          start: new Date(Date.now() - 1800_000).toISOString().replace(/\.\d+Z$/, 'Z'),
          end: new Date(Date.now() + 3600_000).toISOString().replace(/\.\d+Z$/, 'Z')
        }),
        session('s-2', 'Consulta previa al examen', 3, { type: 'CONSULTA' }),
        session('s-3', 'Sesión cancelada', 4, { status: 'CANCELADA' })
      ]
    })
  )
  await page.route(`${OFFERINGS}/${otherOffering.code}/sessions`, (route) =>
    route.fulfill({ json: [session('s-4', 'Laboratorio de anuncios', 2, { status: 'REPROGRAMADA' }), session('s-5', 'Revisión de casos', 9)] })
  )
  await page.route(`${OFFERINGS}/${BUSY[2]!.code}/sessions`, (route) => route.fulfill({ json: [session('s-6', 'Presentación del curso', 14)] }))
}

const reloaded = (prepare: (page: Page) => Promise<unknown>) => async (page: Page) => {
  await prepare(page)
  await page.reload()
  await page.waitForLoadState('networkidle')
}

// una clase de verdad: correos largos, evaluaciones, sin correo, quien va atrás y quien ya acabó
const CLASS = Array.from({ length: 9 }, (_, index) => {
  const percent = [0, 12, 25, 50, 62, 75, 88, 100, 100][index]!
  return {
    enrollmentId: `m-${index}`,
    email: index === 4 ? null : `estudiante.${index + 1}@municipalidad.provincial.demo.local`,
    status: index === 8 ? 'FINALIZADA' : 'ACTIVA',
    progress: { completedLessons: Math.round((percent * 8) / 100), totalLessons: 8, percent },
    attendance: { attended: Math.min(index, 6), total: 6 },
    assessments: [
      {
        lessonId: 'parcial',
        title: 'Evaluación parcial',
        bestPercent: index > 5 ? 90 - index : index > 3 ? 45 : null,
        passed: index > 5 ? true : index > 3 ? false : null,
        pending: false
      },
      { lessonId: 'final', title: 'Evaluación final', bestPercent: null, passed: null, pending: index === 2 || index === 6 }
    ]
  }
})

const rosterOf = async (page: Page) => {
  await page.route(OFFERINGS, (route) => route.fulfill({ json: BUSY }))
  await page.route(`${OFFERINGS}/${offering.code}/students`, (route) => route.fulfill({ json: CLASS }))
}

export const teachingScenarios: Scenario[] = [
  { name: 'teacher-offerings', path: '/docencia', api: teacher },
  { name: 'teacher-offerings-busy', path: '/docencia', api: teacher, act: reloaded(busy) },
  { name: 'teacher-offerings-empty', path: '/docencia', api: { ...teacher, noOfferings: true } },
  {
    name: 'teacher-offerings-loading',
    path: '/docencia',
    api: teacher,
    // la lista no llega nunca: se queda el esqueleto
    act: async (page) => {
      await page.route(OFFERINGS, () => undefined)
      await page.reload()
      await page.getByRole('status').first().waitFor()
    }
  },
  { name: 'teacher-offerings-error', path: '/docencia', api: teacher, act: reloaded((page) => failing(page, OFFERINGS)) },
  {
    name: 'teacher-offerings-blocks-failed',
    path: '/docencia',
    api: teacher,
    act: reloaded(async (page) => {
      await failing(page, `${OFFERINGS}/*/attempts`)
      await failing(page, `${OFFERINGS}/*/sessions`)
    })
  },
  { name: 'teacher-roster', path: OFFERING, api: teacher },
  { name: 'teacher-roster-busy', path: OFFERING, api: teacher, act: reloaded(rosterOf) },
  {
    name: 'teacher-roster-filtered',
    path: OFFERING,
    api: teacher,
    act: async (page) => {
      await reloaded(rosterOf)(page)
      await page.getByRole('searchbox', { name: 'Buscar por correo' }).fill('estudiante.3')
    }
  },
  {
    name: 'teacher-roster-no-results',
    path: OFFERING,
    api: teacher,
    act: async (page) => {
      await reloaded(rosterOf)(page)
      await page.getByRole('searchbox', { name: 'Buscar por correo' }).fill('nadie')
    }
  },
  {
    name: 'teacher-roster-empty',
    path: OFFERING,
    api: teacher,
    act: reloaded((page) => page.route(`${OFFERINGS}/${offering.code}/students`, (route) => route.fulfill({ json: [] })))
  },
  {
    name: 'teacher-roster-loading',
    path: OFFERING,
    api: teacher,
    act: async (page) => {
      await page.route(`${OFFERINGS}/${offering.code}/students`, () => undefined)
      await page.reload()
      await page.getByRole('status').first().waitFor()
    }
  },
  { name: 'teacher-roster-error', path: OFFERING, api: teacher, act: reloaded((page) => failing(page, `${OFFERINGS}/${offering.code}/students`)) },
  { name: 'teacher-roster-not-found', path: '/docencia/edicion-de-otro', api: teacher },
  { name: 'teacher-queue', path: `${OFFERING}/correccion`, api: teacher },
  { name: 'teacher-sessions', path: `${OFFERING}/sesiones`, api: teacher }
]
