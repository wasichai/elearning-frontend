import type { Page, Request, Route } from '@playwright/test'
import { coursePage, courseDetail, courseSummary, courseWithoutOffering, problem } from '../src/modules/catalog/test/fixtures'
import type { Classroom, Lesson } from '../src/modules/classroom/contract'
import { classroom, lessonHtml, otherEnrollment } from '../src/modules/classroom/test/fixtures'

// la API del LMS simulada en el navegador, con los ejemplos del contrato (docs/api/lms.md del backend) que usan también
// las pruebas unitarias. el catálogo filtra de verdad lo que el contrato filtra, así la lista cambia con la búsqueda; el
// aula guarda su estado en la prueba (no en la página), así sobrevive a una recarga como en el servidor.
// cualquier otra ruta de /api es un 404 problem+json y queda anotada en `unexpected` para que la prueba lo vea.

const COURSES = '/api/lms/public/catalog/courses'
const CLASSROOM = '/api/lms/classroom/'
const ENROLLMENTS = '/api/lms/classroom/enrollments'
// la sesión de Wasichai tal como la guarda @wasichai/core (storagePrefix 'elearning' de src/config.ts)
const STORAGE_PREFIX = 'elearning'
export const STUDENT = { id: 'u-estudiante', email: 'estudiante@demo.local', displayName: 'Rosa Estudiante', organizationId: 'org-demo', roles: ['ESTUDIANTE'] }
const STUDENT_PERMISSIONS = { admin: false, objects: { curso: ['READ'], categoria: ['READ'] } }

export const COURSES_IN_CATALOG = [courseSummary, courseWithoutOffering]
export const DETAILS: Record<string, unknown> = { [courseSummary.slug]: courseDetail }

// una respuesta JSON (o problem+json) o, para los archivos, el contenido tal cual
type Reply = { status: number; body: unknown; raw?: { body: string; contentType: string } }
// una respuesta preparada por la prueba: gana a la simulación mientras devuelva algo
type Override = (url: URL) => Reply | undefined

export interface FakeApiOptions {
  // con sesión de estudiante: token y usuario en el almacenamiento antes de cargar la página
  signedIn?: boolean
  // ya matriculada en el curso de SRTM (por defecto); sin matrícula, la ficha la crea con POST /api/lms/enrollments
  enrolled?: boolean
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
  // las que no son del catálogo: la página pública no debería hacer ninguna
  readonly unexpected: string[]
  // la próxima respuesta a lo que cumpla `matches` (una sola vez)
  failOnce: (matches: (url: URL) => boolean, status: number) => void
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

function classroomState(enrolled: boolean) {
  const classrooms: Record<string, ClassroomData> = enrolled ? { [classroom.id]: freshClassroom() } : {}
  const seen = new Map<string, unknown>()
  return { classrooms, others: [structuredClone(otherEnrollment)], seen }
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
  if (method === 'GET' && url.pathname === ENROLLMENTS) return { status: 200, body: [...Object.values(state.classrooms).map(enrollmentOf), ...state.others] }
  const [id, rest] = url.pathname
    .slice(ENROLLMENTS.length + 1)
    .split(/\/(.*)/s)
    .map((part) => (part === undefined ? undefined : decodeURIComponent(part)))
  const data = id === undefined ? undefined : state.classrooms[id]
  if (!data) return { status: 404, body: problem(404, 'Matrícula no encontrada') }
  if (method === 'GET' && !rest) return { status: 200, body: data }
  const lessonId = rest?.match(/^lessons\/([^/]+)\/events$/)?.[1]
  if (method === 'POST' && lessonId) return lessonEvent(state, data, lessonId, (body ?? {}) as { type?: string; clientEventId?: string })
  return undefined
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
  const id = FILES.exec(url.pathname)?.[1]
  if (method !== 'GET' || !id) return undefined
  const file = FILE_CONTENTS[id]
  return file ? { status: 200, body: null, raw: file } : { status: 404, body: problem(404, 'Archivo no encontrado') }
}

// lo que @wasichai/core pide por su cuenta con sesión: permisos, preferencias y, en el panel de inicio, los objetos.
// sin endpoint de preferencias (404), core las guarda solo en el navegador
const isPlatform = (url: URL) => url.pathname.startsWith('/api/auth/') || url.pathname === '/api/objects'

function simulatePlatform(method: string, url: URL): Reply | undefined {
  if (method === 'GET' && url.pathname === '/api/auth/me/permissions') return { status: 200, body: STUDENT_PERMISSIONS }
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
  const state = classroomState(options.enrolled ?? true)
  if (options.signedIn)
    await page.addInitScript(
      ({ prefix, user }) => {
        localStorage.setItem(`${prefix}.token`, 'token-e2e')
        localStorage.setItem(`${prefix}.user`, JSON.stringify(user))
      },
      { prefix: STORAGE_PREFIX, user: STUDENT }
    )
  const api: FakeApi = {
    catalogRequests: [],
    classroomRequests: [],
    enrollRequests: [],
    fileRequests: [],
    unexpected: [],
    failOnce: (matches, status) => {
      let used = false
      overrides.push((url) => {
        if (used || !matches(url)) return undefined
        used = true
        return { status, body: problem(status, 'Fallo simulado') }
      })
    }
  }
  await page.route('**/api/**', async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    if (isCatalog(request, url)) api.catalogRequests.push(url)
    else if (url.pathname.startsWith(CLASSROOM)) api.classroomRequests.push(`${method} ${url.pathname}`)
    else if (url.pathname === '/api/lms/enrollments' && method === 'POST')
      api.enrollRequests.push({ offering: request.postDataJSON()?.offering, idempotencyKey: (await request.allHeaders())['idempotency-key'] ?? null })
    else if (FILES.test(url.pathname)) api.fileRequests.push({ path: url.pathname, authorization: (await request.allHeaders()).authorization ?? null })
    else if (!isPlatform(url)) api.unexpected.push(`${method} ${url.pathname}`)
    let reply: Reply | undefined
    for (const override of overrides) reply ??= override(url)
    if (url.pathname === '/api/lms/enrollments' && method === 'POST') reply ??= simulateEnroll(state, request.postDataJSON())
    reply ??= simulatePlatform(method, url) ?? simulateClassroom(state, method, url, request.postDataJSON()) ?? simulateFile(method, url) ?? simulate(url)
    if (reply.raw) return route.fulfill({ status: reply.status, contentType: reply.raw.contentType, body: reply.raw.body })
    await route.fulfill({
      status: reply.status,
      contentType: reply.status < 400 ? 'application/json' : 'application/problem+json',
      body: JSON.stringify(reply.body)
    })
  })
  return api
}

export const isCourseList = (url: URL) => url.pathname === COURSES
export const isCourse = (slug: string) => (url: URL) => url.pathname === `${COURSES}/${slug}`
