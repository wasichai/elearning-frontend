import type { Page } from '@playwright/test'
import {
  assessmentClassroom,
  assessmentSummary,
  classroom,
  enrollment,
  finishedEnrollment,
  gradedAttempt,
  openAttempt,
  otherEnrollment,
  sessions,
  submittedAttempt
} from '../../../src/modules/classroom/test/fixtures'
import { problem } from '../../../src/modules/catalog/test/fixtures'
import { student, type Scenario } from '../scenario'

const ENROLLMENTS = '**/api/lms/classroom/enrollments'
const PANEL = '**/api/lms/classroom/panel*'
// los elementos del panel: la matrícula con lo que tiene por delante. por defecto, nada
const panelRows = (...rows: object[]) => rows.map((row) => ({ upcomingSessions: [], pendingAssessments: [], ...row }))
const serving = (page: Page, rows: unknown[]) => page.route(PANEL, (route) => route.fulfill({ json: rows }))
const down = { status: 503, contentType: 'application/problem+json', json: problem(503, 'Caído') }

// la simulación se prepara antes de cargar: aquí se le gana con una ruta propia y se vuelve a cargar la pantalla.
// el reloj se fija antes de la sesión de noviembre de los ejemplos, para que la captura no cambie con la fecha
async function panelAt(page: Page, prepare?: () => Promise<unknown>) {
  await page.clock.setFixedTime(new Date('2026-11-13T12:00:00Z'))
  await prepare?.()
  await page.reload()
  await page.waitForLoadState('networkidle')
}

// el aula y sus secciones, con una respuesta propia sobre la simulación
const fail = (status: number) => ({ status, contentType: 'application/problem+json', json: problem(status, 'Caído') })
const CLASSROOM_SRTM = '**/api/lms/classroom/enrollments/mat-srtm-1'
const CLASSROOM_SGSPE = '**/api/lms/classroom/enrollments/mat-sgspe-1'
const SESSIONS_SGSPE = `${CLASSROOM_SGSPE}/sessions`
const reloadWith = async (page: Page, prepare: () => Promise<unknown>) => {
  await prepare()
  await page.reload()
  await page.waitForLoadState('networkidle')
}
const hang = async (page: Page, url: string) => {
  await page.route(url, () => undefined)
  await page.reload({ waitUntil: 'load' })
  await page.waitForTimeout(300)
}
const titled = (data: { course: object }) => ({ json: { ...data, course: { ...data.course, title: LONG_TITLE } } })
const emptyCourse = { ...classroom, units: [], nextLesson: null, progress: { completedLessons: 0, totalLessons: 0, percent: 0 } }
const LONG_TITLE = 'Procedimientos de fiscalización y determinación de deudas tributarias municipales para gestores de rentas'

const enrollmentAtStart = {
  ...enrollment,
  progress: { completedLessons: 0, totalLessons: 3, percent: 0 },
  nextLesson: { ...enrollment.nextLesson, id: 'lec-html', title: 'Tipos de anuncio', lessonOrder: 1 }
}
const certified = { ...finishedEnrollment, status: 'FINALIZADA', certificateCode: 'K7Q2-M9XW-4RTB' }
const finished = { ...finishedEnrollment, id: 'mat-fin-1', status: 'FINALIZADA', course: { slug: 'catastro', code: 'CAT-1', title: 'Catastro urbano' } }
const longTitle = {
  ...otherEnrollment,
  course: { ...otherEnrollment.course, title: 'Procedimientos de fiscalización y determinación de deudas tributarias municipales para gestores de rentas' },
  nextLesson: { id: 'lec-eva', title: 'Una lección con un título bastante largo para comprobar cómo baja de línea en el panel', unitOrder: 2, lessonOrder: 11 }
}

// la evaluación: el resumen con otros datos, y un intento abierto servido con el plazo a tantos minutos de ahora (null, sin límite)
const ASSESSMENT = '/mis-cursos/mat-sgspe-1?leccion=lec-eva'
const ATTEMPT = `${ASSESSMENT}&intento=int-1`
const summaryWith = (patch: object, status = assessmentClassroom.status) => {
  const copy = structuredClone(assessmentClassroom)
  Object.assign(copy.units[0]!.lessons[1]!.assessment!, patch)
  return { ...copy, status }
}
const withSummary = (page: Page, patch: object, status?: string) =>
  reloadWith(page, () => page.route(CLASSROOM_SGSPE, (route) => route.fulfill({ json: summaryWith(patch, status) })))
const attemptIn = (page: Page, minutes: number | null) =>
  reloadWith(page, () =>
    page.route('**/api/lms/classroom/attempts/int-1', (route) =>
      route.fulfill({ json: { ...openAttempt, deadline: minutes === null ? null : new Date(Date.now() + minutes * 60_000).toISOString() } })
    )
  )
const answerSome = async (page: Page) => {
  await page.getByRole('radio', { name: 'La municipalidad' }).check()
  await page.getByRole('button', { name: /^(Pregunta 4, en blanco|Question 4, blank)$/ }).click()
  await page.getByRole('textbox', { name: '4. ¿Cuáles son las siglas del sistema de rentas?' }).fill('SRTM')
}
// el resultado de un intento, con el resumen de la evaluación que le corresponde
const resultOf = (page: Page, attempt: object, summary: object, status?: string) =>
  reloadWith(page, async () => {
    await page.route(CLASSROOM_SGSPE, (route) => route.fulfill({ json: summaryWith(summary, status) }))
    await page.route('**/api/lms/classroom/attempts/int-1', (route) => route.fulfill({ json: attempt }))
  })
const passedSummary = { attemptsUsed: 1, best: { percent: 80, passed: true, pending: false } }
// aprobada, la lección queda hecha y su pie ofrece la siguiente
const passedResult = (page: Page) =>
  reloadWith(page, async () => {
    const copy = summaryWith(passedSummary)
    copy.units[0]!.lessons[1]!.progress.status = 'APROBADA'
    await page.route(CLASSROOM_SGSPE, (route) => route.fulfill({ json: copy }))
    await page.route('**/api/lms/classroom/attempts/int-1', (route) => route.fulfill({ json: gradedAttempt }))
  })
const toQuestion = async (page: Page, name: RegExp) => {
  await page.getByRole('article', { name }).scrollIntoViewIfNeeded()
  await page.waitForTimeout(100)
}
const failedSummary = { attemptsUsed: 1, best: { percent: 60, passed: false, pending: false } }
const failedResult = { ...gradedAttempt.result, score: 6, percent: 60, passed: false }
const failedAttempt = { ...gradedAttempt, result: failedResult }
// lo más largo que puede llegar: nota con decimales, enunciado y respuesta sin espacios, comentario con varias líneas
const longAttempt = {
  ...gradedAttempt,
  questions: gradedAttempt.questions.map((question) =>
    question.id === 'p-open' ? { ...question, prompt: `${question.prompt} ${'Anticonstitucionalmente'.repeat(6)}` } : question
  ),
  answers: gradedAttempt.answers.map((answer) =>
    answer.questionId === 'p-open' ? { ...answer, text: `Primero.\n${'Desproporcionadamente'.repeat(8)}` } : answer
  ),
  result: {
    ...failedResult,
    percent: 66.67,
    questions: failedResult.questions.map((outcome) =>
      outcome.questionId === 'p-open'
        ? { ...outcome, comment: 'Falta citar la ordenanza.\nRevisa también el área gravada y la tasa vigente de este año.' }
        : outcome
    )
  }
}
// la lección de repaso: sin ninguna, y con un título largo que baja de línea
const withoutReview = {
  ...failedAttempt,
  result: { ...failedResult, questions: failedResult.questions.map((outcome) => ({ ...outcome, reviewLessonId: null })) }
}
const longReviewSummary = (() => {
  const copy = summaryWith(failedSummary)
  copy.units[0]!.lessons[0]!.title = `Una lección de repaso con un título bastante largo para ver cómo baja de línea ${'Anticonstitucionalmente'.repeat(3)}`
  return copy
})()
const startAttempt = async (page: Page) => {
  await page.getByRole('button', { name: /^(Comenzar intento|Start attempt)/ }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^(Comenzar|Start)$/ })
    .click()
  await page.getByRole('heading', { level: 3, name: /^(Intento|Attempt) 1$/ }).waitFor()
}

export const classroomScenarios: Scenario[] = [
  { name: 'student-courses', path: '/mis-cursos', api: student },
  // sin SRTM queda SGSPE (la simulación siempre la tiene): un solo curso, sin cifras en el riel
  { name: 'student-courses-single', path: '/mis-cursos', api: { ...student, enrolled: false } },
  {
    name: 'student-courses-empty',
    path: '/mis-cursos',
    api: student,
    act: (page) => panelAt(page, () => serving(page, []))
  },
  { name: 'student-courses-rail', path: '/mis-cursos', api: student, act: (page) => panelAt(page) },
  {
    name: 'student-courses-mixed',
    path: '/mis-cursos',
    api: student,
    act: (page) =>
      panelAt(page, () =>
        serving(
          page,
          panelRows(
            { ...enrollment, id: 'mat-srtm-1' },
            { ...longTitle, upcomingSessions: [sessions.at(-1)], pendingAssessments: [{ lessonId: 'lec-eva', assessment: assessmentSummary }] },
            finished,
            certified
          )
        )
      )
  },
  {
    name: 'student-courses-completed',
    path: '/mis-cursos',
    api: student,
    act: (page) => panelAt(page, () => serving(page, panelRows(certified)))
  },
  {
    // el panel falla y la lista de matrículas llega: los cursos siguen y el riel lo dice
    name: 'student-courses-rail-error',
    path: '/mis-cursos',
    api: student,
    act: (page) => panelAt(page, () => page.route(PANEL, (route) => route.fulfill(down)))
  },
  {
    // la primera página llega y la segunda falla: lo leído no se da por completo
    name: 'student-courses-later-page-error',
    path: '/mis-cursos',
    api: student,
    act: (page) =>
      panelAt(page, () =>
        page.route(PANEL, (route) => {
          if (route.request().url().includes('page=0')) {
            const size = Number(new URL(route.request().url()).searchParams.get('size'))
            return route.fulfill({ json: panelRows(...Array.from({ length: size }, (_, index) => ({ ...enrollment, id: `mat-${index}` }))) })
          }
          return route.fulfill(down)
        })
      )
  },
  {
    name: 'student-courses-many-sessions',
    path: '/mis-cursos',
    api: student,
    act: (page) => {
      const [base] = sessions.slice(-1)
      const next = Array.from({ length: 7 }, (_, index) => ({
        ...base,
        id: `s-${index}`,
        title: `Consulta ${index + 1}`,
        start: `2026-11-${14 + index}T13:00:00Z`,
        end: `2026-11-${14 + index}T14:00:00Z`,
        originalSessionId: null
      }))
      const sgspe = {
        ...assessmentClassroom,
        units: undefined,
        upcomingSessions: next,
        pendingAssessments: [{ lessonId: 'lec-eva', assessment: assessmentSummary }]
      }
      return panelAt(page, () => serving(page, panelRows(enrollmentAtStart, sgspe)))
    }
  },
  {
    name: 'student-courses-error',
    path: '/mis-cursos',
    api: student,
    act: (page) =>
      panelAt(page, async () => {
        await page.route(PANEL, (route) => route.fulfill(down))
        await page.route(ENROLLMENTS, (route) => route.fulfill(down))
      })
  },
  {
    // el panel nunca llega: la geometría de la pantalla mientras carga
    name: 'student-courses-loading',
    path: '/mis-cursos',
    api: student,
    act: async (page) => {
      await page.route(PANEL, () => undefined)
      await page.reload({ waitUntil: 'load' })
      await page.waitForTimeout(300)
    }
  },
  {
    // al reintentar tras un fallo: la lista ya está a la vista y los dos bloques cargan
    name: 'student-courses-rail-loading',
    path: '/mis-cursos',
    api: student,
    act: async (page) => {
      await page.route(PANEL, (route) => route.fulfill(down))
      await page.reload()
      const retry = page.getByRole('button', { name: /^(Reintentar las sesiones|Retry the sessions)$/ })
      await retry.waitFor()
      await page.unroute(PANEL)
      await page.route(PANEL, () => undefined)
      await retry.click()
      await page.getByRole('status').first().waitFor()
    }
  },
  { name: 'student-course', path: '/mis-cursos/mat-srtm-1', api: student },
  {
    name: 'student-course-empty',
    path: '/mis-cursos/mat-srtm-1',
    api: student,
    act: (page) => reloadWith(page, () => page.route(CLASSROOM_SRTM, (route) => route.fulfill({ json: emptyCourse })))
  },
  {
    name: 'student-course-long-title',
    path: '/mis-cursos/mat-srtm-1',
    api: student,
    act: (page) => reloadWith(page, () => page.route(CLASSROOM_SRTM, (route) => route.fulfill(titled(classroom))))
  },
  { name: 'student-course-loading', path: '/mis-cursos/mat-srtm-1', api: student, act: (page) => hang(page, CLASSROOM_SRTM) },
  {
    name: 'student-course-error',
    path: '/mis-cursos/mat-srtm-1',
    api: student,
    act: (page) => reloadWith(page, () => page.route(CLASSROOM_SRTM, (route) => route.fulfill(fail(503))))
  },
  { name: 'student-course-missing', path: '/mis-cursos/de-otra-persona', api: student },
  { name: 'student-lesson', path: '/mis-cursos/mat-srtm-1?leccion=lec-html', api: student },
  {
    name: 'student-lesson-sepia',
    path: '/mis-cursos/mat-srtm-1?leccion=lec-html',
    api: student,
    act: async (page) => {
      await page.getByRole('button', { name: /^(Modo lectura|Reading mode)$/ }).click()
      await page.waitForTimeout(200)
    }
  },
  {
    name: 'student-lesson-syllabus',
    path: '/mis-cursos/mat-srtm-1?leccion=lec-html',
    api: student,
    act: async (page) => {
      const open = page.getByRole('button', { name: /^(Temario|Syllabus)$/ })
      if (await open.isVisible()) await open.click()
      await page.waitForTimeout(200)
    }
  },
  { name: 'student-lesson-video', path: '/mis-cursos/mat-srtm-1?leccion=lec-video', api: student },
  { name: 'student-lesson-pdf', path: '/mis-cursos/mat-srtm-1?leccion=lec-pdf', api: student },
  { name: 'student-assessment', path: '/mis-cursos/mat-sgspe-1?leccion=lec-eva', api: student },
  { name: 'student-assessment-open', path: ASSESSMENT, api: student, act: (page) => withSummary(page, { attemptsUsed: 1, openAttemptId: 'int-1' }) },
  {
    name: 'student-assessment-exhausted',
    path: ASSESSMENT,
    api: student,
    act: (page) => withSummary(page, { attemptsUsed: 2, best: { percent: 60, passed: false, pending: false } })
  },
  { name: 'student-assessment-finished', path: ASSESSMENT, api: student, act: (page) => withSummary(page, { attemptsUsed: 1 }, 'FINALIZADA') },
  {
    name: 'student-assessment-untimed',
    path: ASSESSMENT,
    api: student,
    act: (page) => withSummary(page, { timeLimitMinutes: null, maxAttempts: 5, attemptsUsed: 3 })
  },
  { name: 'student-attempt', path: ASSESSMENT, api: student, act: startAttempt },
  {
    name: 'student-attempt-answered',
    path: ASSESSMENT,
    api: student,
    act: async (page) => {
      await startAttempt(page)
      await answerSome(page)
      await page.getByRole('button', { name: /^(Guardar respuestas|Save answers)$/ }).click()
      await page.getByText(/^(Guardado|Saved) \d/).waitFor()
      await page.getByRole('button', { name: /^(Pregunta 2, en blanco|Question 2, blank)$/ }).click()
      await page.getByRole('checkbox', { name: 'Adosado' }).check()
    }
  },
  {
    name: 'student-attempt-submit-dialog',
    path: ASSESSMENT,
    api: student,
    act: async (page) => {
      await startAttempt(page)
      await answerSome(page)
      await page.getByRole('button', { name: /^(Entregar|Submit)$/ }).click()
      await page.getByRole('dialog').waitFor()
    }
  },
  {
    name: 'student-attempt-file',
    path: ASSESSMENT,
    api: student,
    act: async (page) => {
      await startAttempt(page)
      await page.getByRole('button', { name: /^(Pregunta 6, en blanco|Question 6, blank)$/ }).click()
    }
  },
  { name: 'student-attempt-last-five', path: ATTEMPT, api: student, act: (page) => attemptIn(page, 4.5) },
  { name: 'student-attempt-last-minute', path: ATTEMPT, api: student, act: (page) => attemptIn(page, 0.75) },
  { name: 'student-attempt-expired', path: ATTEMPT, api: student, act: (page) => attemptIn(page, -1) },
  { name: 'student-attempt-untimed', path: ATTEMPT, api: student, act: (page) => attemptIn(page, null) },
  {
    name: 'student-attempt-save-failed',
    path: ASSESSMENT,
    api: student,
    act: async (page) => {
      await startAttempt(page)
      await page.getByRole('radio', { name: 'La municipalidad' }).check()
      await page.route('**/api/lms/classroom/attempts/*/answers', (route) => route.abort('internetdisconnected'))
      await page.getByRole('button', { name: /^(Guardar respuestas|Save answers)$/ }).click()
      await page.getByRole('alert').waitFor()
    }
  },
  {
    name: 'student-attempt-offline',
    path: ASSESSMENT,
    api: student,
    act: async (page) => {
      await startAttempt(page)
      await page.context().setOffline(true)
      await page.getByRole('alert').waitFor()
    }
  },
  {
    name: 'student-attempt-error',
    path: ATTEMPT,
    api: student,
    act: (page) => reloadWith(page, () => page.route('**/api/lms/classroom/attempts/int-1', (route) => route.fulfill(fail(503))))
  },
  { name: 'student-attempt-loading', path: ATTEMPT, api: student, act: (page) => hang(page, '**/api/lms/classroom/attempts/int-1') },
  // el resultado: sin intentos para ver solo la salida, y con reintento disponible
  { name: 'student-result-passed', path: ATTEMPT, api: student, act: passedResult },
  {
    name: 'student-result-passed-end',
    path: ATTEMPT,
    api: student,
    act: async (page) => {
      await passedResult(page)
      await toQuestion(page, /^6\./)
    }
  },
  { name: 'student-result-failed', path: ATTEMPT, api: student, act: (page) => resultOf(page, failedAttempt, { ...failedSummary, attemptsUsed: 2 }) },
  { name: 'student-result-retry', path: ATTEMPT, api: student, act: (page) => resultOf(page, failedAttempt, failedSummary) },
  {
    name: 'student-result-review',
    path: ATTEMPT,
    api: student,
    act: async (page) => {
      await resultOf(page, failedAttempt, failedSummary)
      await toQuestion(page, /^3\./)
    }
  },
  {
    name: 'student-result-no-review',
    path: ATTEMPT,
    api: student,
    act: async (page) => {
      await resultOf(page, withoutReview, failedSummary)
      await toQuestion(page, /^3\./)
    }
  },
  {
    name: 'student-result-review-long',
    path: ATTEMPT,
    api: student,
    act: async (page) => {
      await reloadWith(page, async () => {
        await page.route(CLASSROOM_SGSPE, (route) => route.fulfill({ json: longReviewSummary }))
        await page.route('**/api/lms/classroom/attempts/int-1', (route) => route.fulfill({ json: failedAttempt }))
      })
      await toQuestion(page, /^3\./)
    }
  },
  {
    name: 'student-result-pending',
    path: ATTEMPT,
    api: student,
    act: (page) => resultOf(page, submittedAttempt, { attemptsUsed: 2, best: { percent: null, passed: null, pending: true } })
  },
  { name: 'student-result-finished', path: ATTEMPT, api: student, act: (page) => resultOf(page, failedAttempt, failedSummary, 'FINALIZADA') },
  {
    name: 'student-result-long',
    path: ATTEMPT,
    api: student,
    act: async (page) => {
      await resultOf(page, longAttempt, failedSummary)
      await toQuestion(page, /^5\./)
    }
  },
  { name: 'student-result-long-top', path: ATTEMPT, api: student, act: (page) => resultOf(page, longAttempt, failedSummary) },
  {
    name: 'student-result-retry-dialog',
    path: ATTEMPT,
    api: student,
    act: async (page) => {
      await resultOf(page, failedAttempt, failedSummary)
      await page.getByRole('button', { name: /^(Intentar de nuevo|Try again)$/ }).click()
      await page.getByRole('dialog').waitFor()
    }
  },
  { name: 'student-lesson-session', path: '/mis-cursos/mat-sgspe-1?leccion=lec-sesion', api: student },
  { name: 'student-sessions', path: '/mis-cursos/mat-sgspe-1/sesiones', api: student },
  {
    name: 'student-sessions-empty',
    path: '/mis-cursos/mat-sgspe-1/sesiones',
    api: student,
    act: (page) => reloadWith(page, () => page.route(SESSIONS_SGSPE, (route) => route.fulfill({ json: [] })))
  },
  {
    name: 'student-sessions-error',
    path: '/mis-cursos/mat-sgspe-1/sesiones',
    api: student,
    act: (page) => reloadWith(page, () => page.route(SESSIONS_SGSPE, (route) => route.fulfill(fail(503))))
  },
  { name: 'student-sessions-loading', path: '/mis-cursos/mat-sgspe-1/sesiones', api: student, act: (page) => hang(page, SESSIONS_SGSPE) },
  {
    // terminadas todas: «Próximas» lo dice y lo pasado se lee de lo reciente a lo antiguo
    name: 'student-sessions-all-past',
    path: '/mis-cursos/mat-sgspe-1/sesiones',
    api: student,
    act: (page) =>
      reloadWith(page, async () => {
        await page.clock.setFixedTime(new Date('2026-12-20T12:00:00Z'))
      })
  },
  {
    name: 'student-sessions-agenda',
    path: '/mis-cursos/mat-sgspe-1/sesiones',
    api: student,
    act: (page) =>
      reloadWith(page, async () => {
        await page.clock.setFixedTime(new Date('2026-10-01T12:00:00Z'))
      })
  },
  {
    name: 'student-sessions-long-title',
    path: '/mis-cursos/mat-sgspe-1/sesiones',
    api: student,
    act: (page) => reloadWith(page, () => page.route(CLASSROOM_SGSPE, (route) => route.fulfill(titled(assessmentClassroom))))
  },
  { name: 'student-completion-pending', path: '/mis-cursos/mat-sgspe-1/finalizacion', api: student },
  { name: 'student-completion', path: '/mis-cursos/mat-sgspe-1/finalizacion', api: { ...student, courseComplete: true } },
  {
    name: 'student-completion-issued',
    path: '/mis-cursos/mat-sgspe-1/finalizacion',
    api: { ...student, courseComplete: true, certificateIssued: true },
    // la simulación no marca la matrícula como certificada: se añade el código a su respuesta
    act: async (page) => {
      const enrollment = await page.evaluate(() => fetch('/api/lms/classroom/enrollments/mat-sgspe-1').then((response) => response.json()))
      await page.route('**/api/lms/classroom/enrollments/mat-sgspe-1', (route) =>
        route.fulfill({ json: { ...enrollment, status: 'FINALIZADA', certificateCode: 'K7Q2-M9XW-4RTB' } })
      )
      await page.reload({ waitUntil: 'networkidle' })
    }
  },
  { name: 'certificate', path: '/certificados/K7Q2-M9XW-4RTB', api: { certificateIssued: true } },
  {
    name: 'certificate-print',
    path: '/certificados/K7Q2-M9XW-4RTB',
    api: { certificateIssued: true },
    act: (page) => page.emulateMedia({ media: 'print' })
  },
  { name: 'certificate-missing', path: '/certificados/NO-EXISTE' },
  { name: 'certificate-verify', path: '/certificados' }
]
