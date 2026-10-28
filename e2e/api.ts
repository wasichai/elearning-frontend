import type { Page, Request, Route } from '@playwright/test'
import { coursePage, courseDetail, courseSummary, courseWithoutOffering, problem } from '../src/modules/catalog/test/fixtures'

// la API pública del catálogo simulada en el navegador, con los ejemplos del contrato (docs/api/lms.md del backend) que
// usan también las pruebas unitarias. filtra de verdad lo que el contrato filtra, así la lista cambia con la búsqueda.
// cualquier otra ruta de /api es un 404 problem+json y queda anotada en `unexpected` para que la prueba lo vea.

const COURSES = '/api/lms/public/catalog/courses'

export const COURSES_IN_CATALOG = [courseSummary, courseWithoutOffering]
export const DETAILS: Record<string, unknown> = { [courseSummary.slug]: courseDetail }

type Reply = { status: number; body: unknown }
// una respuesta preparada por la prueba: gana a la simulación mientras devuelva algo
type Override = (url: URL) => Reply | undefined

export interface FakeApi {
  // las peticiones a la API pública del catálogo, en orden
  readonly catalogRequests: URL[]
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

function simulate(url: URL): Reply {
  if (url.pathname === COURSES) return listCourses(url)
  const slug = url.pathname.startsWith(`${COURSES}/`) ? url.pathname.slice(COURSES.length + 1) : undefined
  if (slug && !slug.includes('/')) return getCourse(decodeURIComponent(slug))
  return { status: 404, body: problem(404, 'No existe') }
}

function isCatalog(request: Request, url: URL): boolean {
  return request.method() === 'GET' && (url.pathname === COURSES || url.pathname.startsWith(`${COURSES}/`))
}

export async function fakeApi(page: Page): Promise<FakeApi> {
  const overrides: Override[] = []
  const api: FakeApi = {
    catalogRequests: [],
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
    if (isCatalog(request, url)) api.catalogRequests.push(url)
    else api.unexpected.push(`${request.method()} ${url.pathname}`)
    let reply: Reply | undefined
    for (const override of overrides) reply ??= override(url)
    reply ??= simulate(url)
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
