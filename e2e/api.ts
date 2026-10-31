import type { Page, Request, Route } from '@playwright/test'
import { coursePage, courseDetail, courseSummary, courseWithoutOffering, problem } from '../src/modules/catalog/test/fixtures'
import type { Answer, Attempt, Certificate, Classroom, CompletionStatus, Lesson, ResourceFile } from '../src/modules/classroom/contract'
import {
  assessmentClassroom,
  certificate,
  classroom,
  gradedAttempt,
  lessonHtml,
  openAttempt,
  sessions as sgspeSessions
} from '../src/modules/classroom/test/fixtures'
import type { Session } from '../src/shared/sessions'
import { simulateTeaching, TEACHING, teachingState, type TeachingOptions } from './teaching-api'

// la API del LMS simulada en el navegador, con los ejemplos del contrato (docs/api/lms.md del backend) que usan también
// las pruebas unitarias. el catálogo filtra de verdad lo que el contrato filtra, así la lista cambia con la búsqueda; el
// aula guarda su estado en la prueba (no en la página), así sobrevive a una recarga como en el servidor.
// cualquier otra ruta de /api es un 404 problem+json y queda anotada en `unexpected` para que la prueba lo vea.

const COURSES = '/api/lms/public/catalog/courses'
const CLASSROOM = '/api/lms/classroom/'
const ENROLLMENTS = '/api/lms/classroom/enrollments'
const ATTEMPTS = '/api/lms/classroom/attempts'
// la sesión de Wasichai tal como la guarda @wasichai/core (storagePrefix 'elearning' de src/config.ts)
const STORAGE_PREFIX = 'elearning'
export const STUDENT = { id: 'u-estudiante', email: 'estudiante@demo.local', displayName: 'Rosa Estudiante', organizationId: 'org-demo', roles: ['ESTUDIANTE'] }
const STUDENT_PERMISSIONS = { admin: false, objects: { curso: ['READ'], categoria: ['READ'], matricula: ['READ', 'CREATE'] } }
// un docente: lee las asignaciones (docente_edicion), que es lo que muestra el menú «Docencia»
export const TEACHER = { id: 'u-docente', email: 'docente@demo.local', displayName: 'Luis Docente', organizationId: 'org-demo', roles: ['DOCENTE'] }
const TEACHER_PERMISSIONS = { admin: false, objects: { curso: ['READ'], docente_edicion: ['READ'], matricula: ['READ'], progreso_leccion: ['READ'] } }

export const COURSES_IN_CATALOG = [courseSummary, courseWithoutOffering]
export const DETAILS: Record<string, unknown> = { [courseSummary.slug]: courseDetail }

// una respuesta JSON (o problem+json) o, para los archivos, el contenido tal cual
type Reply = { status: number; body: unknown; raw?: { body: string; contentType: string } }
// una respuesta preparada por la prueba: gana a la simulación mientras devuelva algo
type Override = (url: URL, method: string) => Reply | undefined

export interface FakeApiOptions extends TeachingOptions {
  // con sesión: token y usuario en el almacenamiento antes de cargar la página
  signedIn?: boolean
  // quién inicia sesión: el estudiante (por defecto) o un docente con ediciones asignadas
  as?: 'student' | 'teacher'
  // ya matriculada en el curso de SRTM (por defecto); sin matrícula, la ficha la crea con POST /api/lms/enrollments
  enrolled?: boolean
  // SGSPE con todo hecho: lecciones, evaluación aprobada y asistencia; la finalización se cumple
  courseComplete?: boolean
  // el certificado del ejemplo ya emitido (para la verificación pública)
  certificateIssued?: boolean
}

export interface FakeApi {
  // las peticiones a la API pública del catálogo, en orden
  readonly catalogRequests: URL[]
  // las del aula, como «MÉTODO /ruta»
  readonly classroomRequests: string[]
  // las matrículas pedidas desde la ficha, con su Idempotency-Key
  readonly enrollRequests: { offering: unknown; idempotencyKey: string | null }[]
  // las descargas de archivos de recursos, con la cabecera Authorization que llevaron
  readonly fileRequests: { path: string; authorization: string | null }[]
  // las verificaciones públicas de certificados
  readonly certificateRequests: string[]
  // las del espacio docente, como «MÉTODO /ruta»
  readonly teachingRequests: string[]
  // los archivos subidos a una entrega, con su nombre y la cabecera Authorization
  readonly uploads: { path: string; name: string | undefined; authorization: string | null }[]
  // las que no son del catálogo: la página pública no debería hacer ninguna
  readonly unexpected: string[]
  // la próxima respuesta a lo que cumpla `matches` (una sola vez), con el detalle que se quiera
  failOnce: (matches: (url: URL, method: string) => boolean, status: number, detail?: string) => void
}

function listCourses(url: URL): Reply {
  const params = url.searchParams
  const q = params.get('q')?.toLowerCase()
  const content = COURSES_IN_CATALOG.filter(
    (course) =>
      (!q || `${course.title} ${course.summary}`.toLowerCase().includes(q)) &&
      (!params.get('category') || course.category?.slug === params.get('category')) &&
      (!params.get('level') || course.level === params.get('level')) &&
      (!params.get('modality') || course.modality === params.get('modality'))
  )
  const size = Number(params.get('size') ?? 12)
  return {
    status: 200,
    body: { ...coursePage, content, size, totalElements: content.length, totalPages: content.length === 0 ? 0 : 1 }
  }
}

function getCourse(slug: string): Reply {
  const detail = DETAILS[slug]
  return detail ? { status: 200, body: detail } : { status: 404, body: problem(404, 'Curso no encontrado') }
}

// el aula del estudiante: sus matrículas y el aula de cada una. empieza sin nada hecho, para recorrer el curso desde
// la primera lección, y lleva el progreso como el servidor (ADR-0012): solo avanza, cada hecho según cómo se completa
// la lección, idempotente por clientEventId, y el avance de unidades, total y siguiente lección se calcula
type ClassroomData = Classroom
type LessonData = Lesson
const NOT_STARTED: Lesson['progress'] = { status: 'NO_INICIADA', startedAt: null, completedAt: null, evidence: null }
const isDone = (lesson: LessonData) => lesson.progress.status === 'COMPLETADA' || lesson.progress.status === 'APROBADA'

function summary(lessons: LessonData[]) {
  const countable = lessons.filter((lesson) => lesson.completion !== 'NOT_YET')
  const completedLessons = countable.filter(isDone).length
  const totalLessons = countable.length
  return { completedLessons, totalLessons, percent: totalLessons === 0 ? 0 : Math.floor((completedLessons * 100) / totalLessons) }
}

function recount(data: ClassroomData): ClassroomData {
  const units = data.units.map((unit) => ({ ...unit, progress: summary(unit.lessons) }))
  const next = units
    .flatMap((unit) => unit.lessons.map((lesson) => ({ unit, lesson })))
    .find(({ lesson }) => lesson.completion !== 'NOT_YET' && !isDone(lesson))
  return {
    ...data,
    units,
    progress: summary(units.flatMap((unit) => unit.lessons)),
    nextLesson: next ? { id: next.lesson.id, title: next.lesson.title, unitOrder: next.unit.order, lessonOrder: next.lesson.order } : null
  }
}

function freshClassroom(): ClassroomData {
  const fresh = structuredClone(classroom) as Classroom
  for (const unit of fresh.units) for (const lesson of unit.lessons) lesson.progress = { ...NOT_STARTED }
  return recount(fresh)
}

// la segunda matrícula (SGSPE, F3): con su lectura hecha, la evaluación por empezar y una sesión
function classroomState({ enrolled = true, courseComplete = false, certificateIssued = false }: FakeApiOptions) {
  const classrooms: Record<string, ClassroomData> = enrolled ? { [classroom.id]: freshClassroom() } : {}
  const sgspe = structuredClone(assessmentClassroom) as Classroom
  const sessions: Record<string, Session[]> = { [sgspe.id]: structuredClone(sgspeSessions) as Session[] }
  if (courseComplete) {
    for (const lesson of sgspe.units.flatMap((unit) => unit.lessons)) {
      const status = lesson.assessment ? 'APROBADA' : 'COMPLETADA'
      lesson.progress = { status, startedAt: '2026-09-08T14:00:00Z', completedAt: '2026-09-08T15:00:00Z', evidence: 'FINALIZACION_EXPLICITA' }
      if (lesson.assessment) Object.assign(lesson.assessment, { attemptsUsed: 1, best: { percent: 80, passed: true, pending: false } })
    }
    for (const session of sessions[sgspe.id]!) if (session.status !== 'CANCELADA') session.attendance = 'PRESENTE'
  }
  classrooms[sgspe.id] = recount(sgspe)
  const certificates = new Map<string, Certificate>(certificateIssued ? [[certificate.code, structuredClone(certificate) as Certificate]] : [])
  const seen = new Map<string, unknown>()
  return { classrooms, seen, sessions, certificates, attempts: new Map<string, AttemptData>(), submissions: new Map<string, SubmissionData>() }
}

// la finalización como la calcula el servidor: las tres reglas de la versión, citadas
function completionOf(state: ClassroomState, data: ClassroomData): CompletionStatus {
  const lessons = data.units.flatMap((unit) => unit.lessons).filter((lesson) => lesson.completion !== 'NOT_YET')
  const done = lessons.filter(isDone).length
  const assessed = lessons.filter((lesson) => lesson.assessment)
  const passed = assessed.filter((lesson) => lesson.progress.status === 'APROBADA').length
  const held = (state.sessions[data.id] ?? []).filter((session) => session.status !== 'CANCELADA')
  const attended = held.filter((session) => session.attendance === 'PRESENTE' || session.attendance === 'TARDE').length
  const percent = held.length === 0 ? 100 : Math.round((attended * 100) / held.length)
  const rules = [
    { rule: 'LESSONS' as const, met: done === lessons.length, detail: `${done} de ${lessons.length} lecciones` },
    { rule: 'ASSESSMENTS' as const, met: passed === assessed.length, detail: `${passed} de ${assessed.length} evaluaciones aprobadas` },
    { rule: 'ATTENDANCE' as const, met: percent >= 75, detail: `${percent} % de asistencia (mínimo 75 %)` }
  ]
  return { met: rules.every((rule) => rule.met), rules }
}

// POST …/certificate: 200 el ya emitido, 400 nombre inválido, 409 reglas pendientes, 201 nuevo (y la matrícula se cierra)
function issueCertificate(state: ClassroomState, data: ClassroomData, body: unknown): Reply {
  if (data.certificateCode) return { status: 200, body: state.certificates.get(data.certificateCode) }
  const holderName = String((body as { holderName?: unknown } | null)?.holderName ?? '').trim()
  if (holderName.length === 0 || holderName.length > 120) return { status: 400, body: problem(400, 'El nombre debe tener de 1 a 120 caracteres') }
  const completion = completionOf(state, data)
  if (!completion.met) return { status: 409, body: { ...problem(409, 'Aún no cumples las reglas de finalización'), rules: completion.rules } }
  const issued: Certificate = {
    ...(structuredClone(certificate) as Certificate),
    issuedAt: now(),
    holderName,
    course: { code: data.course.code, title: data.course.title },
    rules: completion.rules
  }
  state.certificates.set(issued.code, issued)
  Object.assign(data, { status: 'FINALIZADA', certificateCode: issued.code })
  return { status: 201, body: issued }
}

const PUBLIC_CERTIFICATES = '/api/lms/public/certificates/'

function publicCertificate(state: ClassroomState, method: string, url: URL): Reply | undefined {
  if (method !== 'GET' || !url.pathname.startsWith(PUBLIC_CERTIFICATES)) return undefined
  const found = state.certificates.get(decodeURIComponent(url.pathname.slice(PUBLIC_CERTIFICATES.length)))
  return found ? { status: 200, body: found } : { status: 404, body: problem(404, 'Certificado no encontrado') }
}

// POST /api/lms/enrollments: la edición abierta del catálogo matricula (201) o devuelve la matrícula que ya había (200)
function simulateEnroll(state: ClassroomState, body: unknown): Reply {
  const offering = (body as { offering?: unknown } | null)?.offering
  if (offering !== classroom.offering.code) return { status: 404, body: problem(404, 'Edición no encontrada') }
  const existing = state.classrooms[classroom.id]
  if (existing) return { status: 200, body: enrollmentOf(existing) }
  const created = freshClassroom()
  state.classrooms[created.id] = created
  return { status: 201, body: enrollmentOf(created) }
}

type ClassroomState = ReturnType<typeof classroomState>

function enrollmentOf(data: ClassroomData) {
  const { units: _units, ...enrollmentFields } = data
  return enrollmentFields
}

const now = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z')

// POST …/lessons/{lessonId}/events: la regla de cada tipo de lección, o 409
function lessonEvent(state: ClassroomState, data: ClassroomData, lessonId: string, body: { type?: string; clientEventId?: string }): Reply {
  const lesson = data.units.flatMap((unit) => unit.lessons).find((candidate) => candidate.id === lessonId)
  if (!lesson) return { status: 404, body: problem(404, 'Lección no encontrada') }
  const key = `${data.id}/${lessonId}/${body.clientEventId}`
  if (state.seen.has(key)) return { status: 200, body: state.seen.get(key) }
  const progress = lesson.progress
  if (body.type === 'STARTED') {
    if (progress.status === 'NO_INICIADA') Object.assign(progress, { status: 'INICIADA', startedAt: now() })
  } else if (body.type === 'MARKED_COMPLETE' && lesson.completion === 'EXPLICIT') {
    if (!isDone(lesson))
      Object.assign(progress, { status: 'COMPLETADA', startedAt: progress.startedAt ?? now(), completedAt: now(), evidence: 'FINALIZACION_EXPLICITA' })
  } else if (body.type === 'VIDEO_ENDED' && lesson.completion === 'VIDEO_END') {
    if (!isDone(lesson)) Object.assign(progress, { status: 'COMPLETADA', startedAt: progress.startedAt ?? now(), completedAt: now(), evidence: 'FIN_DE_VIDEO' })
  } else return { status: 409, body: problem(409, `${body.type} no se admite en esta lección`) }
  state.classrooms[data.id] = recount(data)
  state.seen.set(key, structuredClone(progress))
  return { status: 200, body: progress }
}

function simulateClassroom(state: ClassroomState, method: string, url: URL, body: unknown): Reply | undefined {
  if (!url.pathname.startsWith(CLASSROOM)) return undefined
  if (url.pathname.startsWith(`${ATTEMPTS}/`)) return simulateAttempt(state, method, url, body)
  if (method === 'GET' && url.pathname === ENROLLMENTS) return { status: 200, body: Object.values(state.classrooms).map(enrollmentOf) }
  const [id, rest] = url.pathname
    .slice(ENROLLMENTS.length + 1)
    .split(/\/(.*)/s)
    .map((part) => (part === undefined ? undefined : decodeURIComponent(part)))
  const data = id === undefined ? undefined : state.classrooms[id]
  if (!data) return { status: 404, body: problem(404, 'Matrícula no encontrada') }
  if (method === 'GET' && !rest) return { status: 200, body: data }
  if (method === 'GET' && rest === 'sessions') return { status: 200, body: state.sessions[data.id] ?? [] }
  if (method === 'GET' && rest === 'completion') return { status: 200, body: completionOf(state, data) }
  if (method === 'POST' && rest === 'certificate') return issueCertificate(state, data, body)
  // una matrícula finalizada queda en solo lectura: ni avance ni intentos nuevos
  if (method === 'POST' && data.status === 'FINALIZADA') return { status: 409, body: problem(409, 'La matrícula no está activa') }
  const lessonId = rest?.match(/^lessons\/([^/]+)\/events$/)?.[1]
  if (method === 'POST' && lessonId) return lessonEvent(state, data, lessonId, (body ?? {}) as { type?: string; clientEventId?: string })
  const attemptsOf = rest?.match(/^lessons\/([^/]+)\/attempts$/)?.[1]
  if (method === 'POST' && attemptsOf) return startAttempt(state, data, attemptsOf)
  return undefined
}

// los intentos (ADR-0016) como el servidor: intentos y plazo impuestos, soluciones guardadas aparte y nunca servidas
// mientras el intento está abierto, corrección automática al enviar y lo abierto o de archivo pendiente del docente
interface AttemptData {
  attempt: Attempt
  enrollmentId: string
  lessonId: string
}
interface SubmissionData {
  id: string
  attemptId: string
  questionId: string
  file: ResourceFile | null
}

const KEY = Object.fromEntries(gradedAttempt.result.questions.map((outcome) => [outcome.questionId, outcome.solution]))
const normalized = (text: string | null | undefined) => (text ?? '').trim().toLowerCase()

function lessonOf(data: ClassroomData, lessonId: string) {
  return data.units.flatMap((unit) => unit.lessons).find((lesson) => lesson.id === lessonId)
}

function startAttempt(state: ClassroomState, data: ClassroomData, lessonId: string): Reply {
  const lesson = lessonOf(data, lessonId)
  if (!lesson) return { status: 404, body: problem(404, 'Lección no encontrada') }
  const assessment = lesson.assessment
  if (!assessment) return { status: 409, body: problem(409, 'La lección no tiene evaluación') }
  if (assessment.openAttemptId) return { status: 200, body: publicAttempt(state, state.attempts.get(assessment.openAttemptId)!.attempt) }
  if (assessment.attemptsUsed >= assessment.maxAttempts) return { status: 409, body: problem(409, 'Ya no quedan intentos') }
  const started = new Date()
  const attempt = structuredClone(openAttempt) as Attempt
  Object.assign(attempt, {
    id: `int-${state.attempts.size + 1}`,
    number: assessment.attemptsUsed + 1,
    startedAt: started.toISOString(),
    deadline: assessment.timeLimitMinutes === null ? null : new Date(started.getTime() + assessment.timeLimitMinutes * 60_000).toISOString(),
    answers: [],
    result: null
  })
  state.attempts.set(attempt.id, { attempt, enrollmentId: data.id, lessonId })
  Object.assign(assessment, { openAttemptId: attempt.id, attemptsUsed: assessment.attemptsUsed + 1 })
  if (lesson.progress.status === 'NO_INICIADA') Object.assign(lesson.progress, { status: 'INICIADA', startedAt: now() })
  state.classrooms[data.id] = recount(data)
  return { status: 201, body: publicAttempt(state, attempt) }
}

// las respuestas con la entrega y su archivo, como las sirve el servidor
function publicAttempt(state: ClassroomState, attempt: Attempt): Attempt {
  return {
    ...attempt,
    answers: attempt.answers.map((answer) => {
      const submission = answer.submissionId ? state.submissions.get(answer.submissionId) : undefined
      return { ...answer, submission: submission ? { id: submission.id, file: submission.file } : null }
    })
  }
}

function grade(attempt: Attempt): NonNullable<Attempt['result']> {
  const questions = attempt.questions.map((question) => {
    const answer = attempt.answers.find((candidate) => candidate.questionId === question.id)
    const key = KEY[question.id]
    const manual = question.type === 'OPEN' || question.type === 'FILE'
    const correct = manual
      ? null
      : question.type === 'SHORT'
        ? (key?.acceptedAnswers ?? []).some((accepted) => normalized(accepted) === normalized(answer?.text))
        : [...(answer?.optionIds ?? [])].sort().join() === [...(key?.optionIds ?? [])].sort().join()
    return {
      questionId: question.id,
      points: manual ? null : correct ? question.points : 0,
      maxPoints: question.points,
      correct,
      comment: null,
      solution: null
    }
  })
  const score = questions.reduce((sum, outcome) => sum + (outcome.points ?? 0), 0)
  const maxScore = questions.reduce((sum, outcome) => sum + outcome.maxPoints, 0)
  const pending = questions.some((outcome) => outcome.points === null)
  const percent = pending ? null : Math.round((score * 100) / maxScore)
  return { score, maxScore, percent, passed: percent === null ? null : percent >= 70, pending, questions }
}

function simulateAttempt(state: ClassroomState, method: string, url: URL, body: unknown): Reply | undefined {
  const [attemptId, rest] = url.pathname
    .slice(ATTEMPTS.length + 1)
    .split(/\/(.*)/s)
    .map((part) => (part === undefined ? undefined : decodeURIComponent(part)))
  const found = attemptId === undefined ? undefined : state.attempts.get(attemptId)
  if (!found) return { status: 404, body: problem(404, 'Intento no encontrado') }
  const { attempt } = found
  if (method === 'GET' && !rest) return { status: 200, body: publicAttempt(state, attempt) }
  if (attempt.status !== 'OPEN') return { status: 409, body: problem(409, 'El intento ya se envió') }
  if (attempt.deadline && Date.parse(attempt.deadline) < Date.now()) return { status: 409, body: problem(409, 'El plazo del intento venció') }
  if (method === 'PUT' && rest === 'answers') {
    attempt.answers = ((body as { answers?: Answer[] } | null)?.answers ?? []).map(({ questionId, optionIds, text, submissionId }) => ({
      questionId,
      optionIds,
      text,
      submissionId
    }))
    return { status: 200, body: publicAttempt(state, attempt) }
  }
  const questionId = rest?.match(/^questions\/([^/]+)\/submission$/)?.[1]
  if (method === 'POST' && questionId) {
    const id = `ent-${state.submissions.size + 1}`
    state.submissions.set(id, { id, attemptId: attempt.id, questionId, file: null })
    return { status: 201, body: { id, file: null, uploadUrl: `/api/objects/entrega/records/${id}/files/archivo` } }
  }
  if (method === 'POST' && rest === 'submit') {
    const result = grade(attempt)
    Object.assign(attempt, { status: result.pending ? 'SUBMITTED' : 'GRADED', submittedAt: now(), result })
    const data = state.classrooms[found.enrollmentId]!
    const lesson = lessonOf(data, found.lessonId)!
    const best = lesson.assessment!.best
    const better = !best || (best.percent ?? -1) < (result.percent ?? -1)
    Object.assign(lesson.assessment!, {
      openAttemptId: null,
      best: better ? { percent: result.percent, passed: result.passed, pending: result.pending } : best
    })
    if (result.passed)
      Object.assign(lesson.progress, { status: 'APROBADA', completedAt: now(), evidence: 'EVALUACION_APROBADA', startedAt: lesson.progress.startedAt ?? now() })
    state.classrooms[data.id] = recount(data)
    return { status: 200, body: publicAttempt(state, attempt) }
  }
  return undefined
}

// POST uploadUrl: el archivo de una entrega (multipart, parte «file»); queda en la entrega con su nombre
const UPLOADS = /^\/api\/objects\/entrega\/records\/([^/]+)\/files\/archivo$/

function simulateUpload(state: ClassroomState, method: string, url: URL, name: string | undefined, size: number): Reply | undefined {
  const id = UPLOADS.exec(url.pathname)?.[1]
  if (method !== 'POST' || !id) return undefined
  const submission = state.submissions.get(id)
  if (!submission) return { status: 404, body: problem(404, 'Entrega no encontrada') }
  submission.file = { name: name ?? 'archivo', contentType: 'application/octet-stream', size, url: url.pathname }
  return { status: 200, body: { name } }
}

// los archivos de los recursos del aula (wasichai-files), por la versión de recurso de su URL
const FILES = /^\/api\/objects\/version_recurso\/records\/([^/]+)\/files\/archivo$/
const FILE_CONTENTS: Record<string, { body: string; contentType: string }> = {
  'vr-html': { body: lessonHtml, contentType: 'text/html' },
  'vr-video': { body: 'no es un vídeo de verdad', contentType: 'video/mp4' },
  'vr-pdf': { body: '%PDF-1.7 guía de liquidación', contentType: 'application/pdf' },
  'vr-xlsx': { body: 'plantilla', contentType: 'application/octet-stream' }
}

function simulateFile(method: string, url: URL): Reply | undefined {
  // la entrega que descarga el docente
  if (method === 'GET' && UPLOADS.test(url.pathname)) return { status: 200, body: null, raw: { body: '%PDF-1.7 liquidación', contentType: 'application/pdf' } }
  const id = FILES.exec(url.pathname)?.[1]
  if (method !== 'GET' || !id) return undefined
  const file = FILE_CONTENTS[id]
  return file ? { status: 200, body: null, raw: file } : { status: 404, body: problem(404, 'Archivo no encontrado') }
}

// lo que @wasichai/core pide por su cuenta con sesión: permisos, preferencias y, en el panel de inicio, los objetos.
// sin endpoint de preferencias (404), core las guarda solo en el navegador
const isPlatform = (url: URL) => url.pathname.startsWith('/api/auth/') || url.pathname === '/api/objects'

function simulatePlatform(method: string, url: URL, teacher: boolean): Reply | undefined {
  // iniciar sesión desde la pantalla de Wasichai: entra quien se simula (estudiante o docente)
  if (method === 'POST' && url.pathname === '/api/auth/login')
    return { status: 200, body: { token: 'token-e2e', expiresAt: '2099-01-01T00:00:00Z', user: teacher ? TEACHER : STUDENT } }
  if (method === 'GET' && url.pathname === '/api/auth/me/permissions') return { status: 200, body: teacher ? TEACHER_PERMISSIONS : STUDENT_PERMISSIONS }
  if (method === 'GET' && url.pathname === '/api/objects') return { status: 200, body: [] }
  return undefined
}

function simulate(url: URL): Reply {
  if (url.pathname === COURSES) return listCourses(url)
  const slug = url.pathname.startsWith(`${COURSES}/`) ? url.pathname.slice(COURSES.length + 1) : undefined
  if (slug && !slug.includes('/')) return getCourse(decodeURIComponent(slug))
  return { status: 404, body: problem(404, 'No existe') }
}

function isCatalog(request: Request, url: URL): boolean {
  return request.method() === 'GET' && (url.pathname === COURSES || url.pathname.startsWith(`${COURSES}/`))
}

export async function fakeApi(page: Page, options: FakeApiOptions = {}): Promise<FakeApi> {
  const overrides: Override[] = []
  const state = classroomState(options)
  const teaching = teachingState(options)
  const teacher = options.as === 'teacher'
  if (options.signedIn)
    await page.addInitScript(
      ({ prefix, user }) => {
        localStorage.setItem(`${prefix}.token`, 'token-e2e')
        localStorage.setItem(`${prefix}.user`, JSON.stringify(user))
      },
      { prefix: STORAGE_PREFIX, user: teacher ? TEACHER : STUDENT }
    )
  const api: FakeApi = {
    catalogRequests: [],
    classroomRequests: [],
    enrollRequests: [],
    fileRequests: [],
    uploads: [],
    certificateRequests: [],
    teachingRequests: [],
    unexpected: [],
    failOnce: (matches, status, detail = 'Fallo simulado') => {
      let used = false
      overrides.push((url, method) => {
        if (used || !matches(url, method)) return undefined
        used = true
        return { status, body: problem(status, detail) }
      })
    }
  }
  await page.route('**/api/**', async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    if (isCatalog(request, url)) api.catalogRequests.push(url)
    else if (url.pathname.startsWith(PUBLIC_CERTIFICATES)) api.certificateRequests.push(url.pathname)
    else if (url.pathname.startsWith(TEACHING)) api.teachingRequests.push(`${method} ${url.pathname}`)
    else if (url.pathname.startsWith(CLASSROOM)) api.classroomRequests.push(`${method} ${url.pathname}`)
    else if (url.pathname === '/api/lms/enrollments' && method === 'POST')
      api.enrollRequests.push({ offering: request.postDataJSON()?.offering, idempotencyKey: (await request.allHeaders())['idempotency-key'] ?? null })
    else if (FILES.test(url.pathname)) api.fileRequests.push({ path: url.pathname, authorization: (await request.allHeaders()).authorization ?? null })
    else if (UPLOADS.test(url.pathname) && method !== 'POST')
      api.fileRequests.push({ path: url.pathname, authorization: (await request.allHeaders()).authorization ?? null })
    else if (UPLOADS.test(url.pathname))
      api.uploads.push({ path: url.pathname, name: uploadedName(request), authorization: (await request.allHeaders()).authorization ?? null })
    else if (!isPlatform(url)) api.unexpected.push(`${method} ${url.pathname}`)
    let reply: Reply | undefined
    for (const override of overrides) reply ??= override(url, method)
    reply ??= simulateUpload(state, method, url, uploadedName(request), request.postDataBuffer()?.length ?? 0)
    if (url.pathname === '/api/lms/enrollments' && method === 'POST') reply ??= simulateEnroll(state, request.postDataJSON())
    reply ??=
      simulatePlatform(method, url, teacher) ??
      simulateTeaching(teaching, method, url, jsonBody(request)) ??
      publicCertificate(state, method, url) ??
      simulateClassroom(state, method, url, jsonBody(request)) ??
      simulateFile(method, url) ??
      simulate(url)
    if (reply.raw) return route.fulfill({ status: reply.status, contentType: reply.raw.contentType, body: reply.raw.body })
    await route.fulfill({
      status: reply.status,
      contentType: reply.status < 400 ? 'application/json' : 'application/problem+json',
      body: JSON.stringify(reply.body)
    })
  })
  return api
}

// el cuerpo JSON de la petición (un multipart no lo es)
function jsonBody(request: Request): unknown {
  try {
    return request.postDataJSON()
  } catch {
    return null
  }
}

// el nombre del archivo de una subida multipart
function uploadedName(request: Request): string | undefined {
  return /filename="([^"]*)"/.exec(request.postDataBuffer()?.toString('latin1') ?? '')?.[1]
}

export const isCourseList = (url: URL) => url.pathname === COURSES
export const isCourse = (slug: string) => (url: URL) => url.pathname === `${COURSES}/${slug}`
