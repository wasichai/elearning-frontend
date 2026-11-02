import type { Page } from '@playwright/test'
import { enrollment, finishedEnrollment, otherEnrollment, sessions } from '../../../src/modules/classroom/test/fixtures'
import { problem } from '../../../src/modules/catalog/test/fixtures'
import { student, type Scenario } from '../scenario'

const ENROLLMENTS = '**/api/lms/classroom/enrollments'
const SESSIONS = '**/api/lms/classroom/enrollments/*/sessions'

// la simulación se prepara antes de cargar: aquí se le gana con una ruta propia y se vuelve a cargar la pantalla.
// el reloj se fija antes de la sesión de noviembre de los ejemplos, para que la captura no cambie con la fecha
async function panelAt(page: Page, prepare?: () => Promise<unknown>) {
  await page.clock.setFixedTime(new Date('2026-11-13T12:00:00Z'))
  await prepare?.()
  await page.reload()
  await page.waitForLoadState('networkidle')
}

const certified = { ...finishedEnrollment, status: 'FINALIZADA', certificateCode: 'K7Q2-M9XW-4RTB' }
const finished = { ...finishedEnrollment, id: 'mat-fin-1', status: 'FINALIZADA', course: { slug: 'catastro', code: 'CAT-1', title: 'Catastro urbano' } }
const longTitle = {
  ...otherEnrollment,
  course: { ...otherEnrollment.course, title: 'Procedimientos de fiscalización y determinación de deudas tributarias municipales para gestores de rentas' },
  nextLesson: { id: 'lec-eva', title: 'Una lección con un título bastante largo para comprobar cómo baja de línea en el panel', unitOrder: 2, lessonOrder: 11 }
}

export const classroomScenarios: Scenario[] = [
  { name: 'student-courses', path: '/mis-cursos', api: student },
  // sin SRTM queda SGSPE (la simulación siempre la tiene): un solo curso, sin cifras en el riel
  { name: 'student-courses-single', path: '/mis-cursos', api: { ...student, enrolled: false } },
  {
    name: 'student-courses-empty',
    path: '/mis-cursos',
    api: student,
    act: (page) => panelAt(page, () => page.route(ENROLLMENTS, (route) => route.fulfill({ json: [] })))
  },
  { name: 'student-courses-rail', path: '/mis-cursos', api: student, act: (page) => panelAt(page) },
  {
    name: 'student-courses-mixed',
    path: '/mis-cursos',
    api: student,
    act: (page) =>
      panelAt(page, () => page.route(ENROLLMENTS, (route) => route.fulfill({ json: [{ ...enrollment, id: 'mat-srtm-1' }, longTitle, finished, certified] })))
  },
  {
    name: 'student-courses-completed',
    path: '/mis-cursos',
    api: student,
    act: (page) => panelAt(page, () => page.route(ENROLLMENTS, (route) => route.fulfill({ json: [certified] })))
  },
  {
    name: 'student-courses-sessions-error',
    path: '/mis-cursos',
    api: student,
    act: (page) =>
      panelAt(page, () => page.route(SESSIONS, (route) => route.fulfill({ status: 503, contentType: 'application/problem+json', json: problem(503, 'Caído') })))
  },
  {
    name: 'student-courses-many-sessions',
    path: '/mis-cursos',
    api: student,
    act: (page) =>
      panelAt(page, () =>
        page.route(SESSIONS, (route) => {
          const [base] = sessions.slice(-1)
          const next = Array.from({ length: 7 }, (_, index) => ({
            ...base,
            id: `s-${index}`,
            title: `Consulta ${index + 1}`,
            start: `2026-11-${14 + index}T13:00:00Z`,
            end: `2026-11-${14 + index}T14:00:00Z`,
            originalSessionId: null
          }))
          return route.fulfill({ json: route.request().url().includes('mat-sgspe-1') ? next : [] })
        })
      )
  },
  {
    name: 'student-courses-error',
    path: '/mis-cursos',
    api: student,
    act: (page) =>
      panelAt(page, () =>
        page.route(ENROLLMENTS, (route) => route.fulfill({ status: 503, contentType: 'application/problem+json', json: problem(503, 'Caído') }))
      )
  },
  {
    // la lista nunca llega: la geometría del panel mientras carga
    name: 'student-courses-loading',
    path: '/mis-cursos',
    api: student,
    act: async (page) => {
      await page.route(ENROLLMENTS, () => undefined)
      await page.reload({ waitUntil: 'load' })
      await page.waitForTimeout(300)
    }
  },
  {
    // la lista llega, el riel no: los dos bloques cargando
    name: 'student-courses-rail-loading',
    path: '/mis-cursos',
    api: student,
    act: async (page) => {
      await page.route('**/api/lms/classroom/enrollments/**', () => undefined)
      await page.reload({ waitUntil: 'load' })
      await page.getByRole('region', { name: 'Continuar aprendiendo' }).waitFor()
    }
  },
  { name: 'student-course', path: '/mis-cursos/mat-srtm-1', api: student },
  { name: 'student-lesson', path: '/mis-cursos/mat-srtm-1?leccion=lec-html', api: student },
  {
    name: 'student-lesson-sepia',
    path: '/mis-cursos/mat-srtm-1?leccion=lec-html',
    api: student,
    act: async (page) => {
      await page.getByRole('button', { name: 'Modo lectura' }).click()
      await page.waitForTimeout(200)
    }
  },
  {
    name: 'student-lesson-syllabus',
    path: '/mis-cursos/mat-srtm-1?leccion=lec-html',
    api: student,
    act: async (page) => {
      const open = page.getByRole('button', { name: 'Temario' })
      if (await open.isVisible()) await open.click()
      await page.waitForTimeout(200)
    }
  },
  { name: 'student-lesson-video', path: '/mis-cursos/mat-srtm-1?leccion=lec-video', api: student },
  { name: 'student-lesson-pdf', path: '/mis-cursos/mat-srtm-1?leccion=lec-pdf', api: student },
  { name: 'student-assessment', path: '/mis-cursos/mat-sgspe-1?leccion=lec-eva', api: student },
  { name: 'student-sessions', path: '/mis-cursos/mat-sgspe-1/sesiones', api: student },
  { name: 'student-completion-pending', path: '/mis-cursos/mat-sgspe-1/finalizacion', api: student },
  { name: 'student-completion', path: '/mis-cursos/mat-sgspe-1/finalizacion', api: { ...student, courseComplete: true } },
  { name: 'certificate', path: '/certificados/K7Q2-M9XW-4RTB', api: { certificateIssued: true } },
  { name: 'certificate-missing', path: '/certificados/NO-EXISTE' },
  { name: 'certificate-verify', path: '/certificados' }
]
