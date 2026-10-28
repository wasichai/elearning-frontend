import type { Page, Request, Route } from '@playwright/test'
import { coursePage, courseDetail, courseSummary, courseWithoutOffering, problem } from '../src/modules/catalog/test/fixtures'
import { classroom, enrollment, lessonHtml, otherEnrollment } from '../src/modules/classroom/test/fixtures'

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
}

export interface FakeApi {
  // las peticiones a la API pública del catálogo, en orden
  readonly catalogRequests: URL[]
  // las del aula, como «MÉTODO /ruta»
  readonly classroomRequests: string[]
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

// el aula del estudiante: sus matrículas y el aula de cada una
function classroomState() {
  const classrooms: Record<string, typeof classroom> = { [classroom.id]: structuredClone(classroom) }
  const enrollments = [structuredClone(enrollment), structuredClone(otherEnrollment)]
  return { classrooms, enrollments }
}

type ClassroomState = ReturnType<typeof classroomState>

function simulateClassroom(state: ClassroomState, method: string, url: URL): Reply | undefined {
  if (!url.pathname.startsWith(CLASSROOM)) return undefined
  if (method === 'GET' && url.pathname === ENROLLMENTS) return { status: 200, body: state.enrollments }
  const id = url.pathname.startsWith(`${ENROLLMENTS}/`) ? decodeURIComponent(url.pathname.slice(ENROLLMENTS.length + 1)) : undefined
  if (method === 'GET' && id !== undefined && !id.includes('/')) {
    const found = state.classrooms[id]
    return found ? { status: 200, body: found } : { status: 404, body: problem(404, 'Matrícula no encontrada') }
  }
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
  const state = classroomState()
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
    else if (FILES.test(url.pathname)) api.fileRequests.push({ path: url.pathname, authorization: (await request.allHeaders()).authorization ?? null })
    else if (!isPlatform(url)) api.unexpected.push(`${method} ${url.pathname}`)
    let reply: Reply | undefined
    for (const override of overrides) reply ??= override(url)
    reply ??= simulatePlatform(method, url) ?? simulateClassroom(state, method, url) ?? simulateFile(method, url) ?? simulate(url)
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
