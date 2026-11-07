import { expect, type Page, type Route } from '@playwright/test'
import { courseDetail, coursePage, courseSummary, courseWithoutOffering, problem } from '../../../src/modules/catalog/test/fixtures'
import { isCourse, isCourseList } from '../../api'
import type { Scenario } from '../scenario'

const CATEGORIES = [
  { slug: 'gestion-municipal', name: 'Gestión municipal', count: 3 },
  { slug: 'programacion', name: 'Programación', count: 2 },
  { slug: 'ia', name: 'Inteligencia artificial', count: 1 },
  { slug: 'atencion', name: 'Atención al ciudadano', count: 1 }
]

// un catálogo con más de los dos cursos de los ejemplos, para ver la cuadrícula llena y cada disponibilidad
const FULL_CATALOG = {
  ...coursePage,
  content: [
    courseSummary,
    { ...courseWithoutOffering, category: CATEGORIES[1] },
    {
      ...courseSummary,
      slug: 'agentes-ia',
      title: 'Agentes de IA con trazabilidad: diseño, evaluación y operación responsable en instituciones públicas',
      illustrative: false,
      level: 'AVANZADO',
      modality: 'SINCRONA',
      category: CATEGORIES[2],
      weeks: 6,
      workload: { totalHours: 216, contactHours: 144, autonomousHours: 72 },
      nextOffering: { ...courseSummary.nextOffering, enrollmentOpen: false, enrollmentStatus: 'FULL' }
    },
    {
      ...courseSummary,
      slug: 'mensajes-de-error',
      title: 'Curso corto: mensajes de error claros',
      summary: null,
      illustrative: false,
      category: CATEGORIES[3],
      modality: 'PRESENCIAL',
      weeks: 1,
      workload: { totalHours: 6, contactHours: 4, autonomousHours: 2 },
      nextOffering: { ...courseSummary.nextOffering, status: 'EN_CURSO', enrollmentOpen: false, enrollmentStatus: 'CLOSED' }
    },
    {
      ...courseSummary,
      slug: 'tramites-en-linea',
      title: 'Instrucciones claras para un trámite en línea',
      summary:
        'Cómo escribir pasos que cualquier persona pueda seguir: orden, verbos, ejemplos, capturas y pruebas con personas reales, con un resumen largo que no cabe en dos líneas de una tarjeta.',
      illustrative: false,
      level: 'INTERMEDIO',
      category: CATEGORIES[0],
      nextOffering: { ...courseSummary.nextOffering, status: 'PROGRAMADA', enrollmentOpen: false, enrollmentStatus: 'CLOSED' }
    },
    {
      ...courseSummary,
      slug: 'padron-municipal',
      title: 'Consultas al padrón municipal',
      illustrative: false,
      category: CATEGORIES[0],
      nextOffering: { ...courseSummary.nextOffering, status: 'INSCRIPCION_ABIERTA', enrollmentOpen: false, enrollmentStatus: 'CLOSED' }
    }
  ],
  totalElements: 18,
  totalPages: 3,
  facets: { ...coursePage.facets, categories: CATEGORIES }
}

const SRTM = isCourse(courseSummary.slug)
const [OPEN_OFFERING] = courseDetail.offerings
const lesson = courseDetail.units[0]!.lessons[0]!
// una ficha larga, con todo lo que el contrato puede dar: varias unidades y ediciones en cada estado
const FULL_COURSE = {
  ...courseDetail,
  units: [
    ...courseDetail.units,
    {
      order: 2,
      title: 'La solicitud en el sistema de rentas municipal, de principio a fin',
      description: null,
      objectives: [],
      estimatedHours: 12,
      lessons: [
        { ...lesson, order: 1, title: 'Registrar una solicitud', type: 'LABORATORIO', durationMinutes: 45 },
        { ...lesson, order: 2, title: 'Sesión de dudas', type: 'SESION', durationMinutes: 60 }
      ]
    },
    {
      order: 3,
      title: 'Cierre',
      description: 'Lo aprendido, en un caso real.',
      objectives: [],
      estimatedHours: null,
      lessons: [{ ...lesson, order: 1, title: 'Caso práctico final', type: 'EVALUACION', durationMinutes: null }]
    },
    { order: 4, title: 'Unidad aún sin contenido', description: null, objectives: [], estimatedHours: null, lessons: [] }
  ],
  offerings: [
    OPEN_OFFERING,
    { ...OPEN_OFFERING, code: 'segunda', startDate: '2027-01-11', endDate: '2027-02-05', schedule: null, teachers: [] },
    {
      ...OPEN_OFFERING,
      code: 'completa',
      startDate: '2027-03-01',
      endDate: '2027-03-26',
      enrollmentOpen: false,
      enrollmentStatus: 'FULL',
      full: true,
      teachers: []
    }
  ]
}
const NO_OFFERINGS = { ...courseDetail, offerings: [] }
const CLOSED_OFFERING = { ...courseDetail, offerings: [{ ...OPEN_OFFERING, enrollmentOpen: false, enrollmentStatus: 'CLOSED' }] }

// la API simulada ya respondió al abrir: esta ruta gana a la de fakeApi y la página vuelve a pedir el catálogo
async function reloadWith(page: Page, reply: (route: Route) => Promise<void>, target: (url: URL) => boolean = isCourseList) {
  await page.route(target, reply)
  await page.reload()
  await page.waitForLoadState('networkidle')
}

const withFullCatalog = (page: Page) => reloadWith(page, (route) => route.fulfill({ json: FULL_CATALOG }))
const withCourse = (page: Page, course: unknown) => reloadWith(page, (route) => route.fulfill({ json: course }), SRTM)
// «Más filtros» se abre con el catálogo ya pintado (si no, el nuevo render lo vuelve a plegar) y se captura abierto y quieto
const openMoreFilters = async (page: Page) => {
  await expect(page.getByText(/^(18 cursos|18 courses)$/).first()).toBeVisible()
  const level = page.getByLabel(/^(Nivel|Level)$/)
  await page.getByText(/^(Más filtros|More filters)/).click()
  await expect(level).toBeVisible()
  await page.waitForTimeout(300)
  await expect(level).toBeVisible()
}

export const catalogScenarios: Scenario[] = [
  { name: 'catalog', path: '/cursos' },
  { name: 'catalog-full', path: '/cursos', act: withFullCatalog },
  {
    // el anillo de foco de la tarjeta, por teclado
    name: 'catalog-card-focus',
    path: '/cursos',
    act: async (page) => {
      await withFullCatalog(page)
      const link = page.getByRole('link', { name: 'Introducción al SGSPE' })
      await link.focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Tab')
      await link.waitFor()
    }
  },
  {
    name: 'catalog-filters-open',
    path: '/cursos',
    act: async (page) => {
      await withFullCatalog(page)
      await openMoreFilters(page)
    }
  },
  {
    name: 'catalog-filters-active',
    path: '/cursos?q=anuncios&category=gestion-municipal&level=INICIAL&minWeeks=3&maxWeeks=8&minPracticeHours=10&prerequisiteKnowledge=navegador-web&sort=title',
    act: withFullCatalog
  },
  {
    name: 'catalog-loading',
    path: '/cursos',
    act: async (page) => {
      // la respuesta no llega nunca: se ve el esqueleto
      await page.route(isCourseList, () => {})
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page
        .getByRole('status')
        .getByText(/^(Cargando cursos|Loading courses)/)
        .waitFor()
    }
  },
  {
    name: 'catalog-error',
    path: '/cursos',
    act: (page) => reloadWith(page, (route) => route.fulfill({ status: 500, json: problem(500, 'Fallo del servidor') }))
  },
  { name: 'catalog-empty', path: '/cursos?q=no-existe-ninguno' },
  { name: 'catalog-course', path: '/cursos/srtm-anuncios' },
  { name: 'catalog-course-long', path: '/cursos/srtm-anuncios', act: (page) => withCourse(page, FULL_COURSE) },
  { name: 'catalog-course-signed-in', path: '/cursos/srtm-anuncios', api: { signedIn: true, enrolled: false } },
  { name: 'catalog-course-enrolled', path: '/cursos/srtm-anuncios', api: { signedIn: true } },
  { name: 'catalog-course-no-offerings', path: '/cursos/srtm-anuncios', act: (page) => withCourse(page, NO_OFFERINGS) },
  { name: 'catalog-course-closed', path: '/cursos/srtm-anuncios', act: (page) => withCourse(page, CLOSED_OFFERING) },
  {
    name: 'catalog-course-conflict',
    path: '/cursos/srtm-anuncios',
    api: { signedIn: true, enrolled: false },
    act: async (page) => {
      await page.route(
        (url) => url.pathname === '/api/lms/enrollments',
        (route) =>
          route.fulfill({
            status: 409,
            contentType: 'application/problem+json',
            json: problem(409, 'Para matricularte en esta edición antes debes aprobar: PRE-X (Fundamentos); PRE-Y (Normativa)')
          })
      )
      await page.getByRole('button', { name: /^(Matricularme en la edición|Enroll in the)/ }).click()
      await page.getByRole('alert').waitFor()
    }
  },
  {
    name: 'catalog-course-loading',
    path: '/cursos/srtm-anuncios',
    act: async (page) => {
      await page.route(SRTM, () => {})
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.getByRole('status').waitFor({ state: 'attached' })
    }
  },
  {
    name: 'catalog-course-error',
    path: '/cursos/srtm-anuncios',
    act: (page) => reloadWith(page, (route) => route.fulfill({ status: 503, json: problem(503, 'Fallo del servidor') }), SRTM)
  },
  { name: 'catalog-course-full', path: '/cursos/srtm-anuncios', api: { offeringFull: true } },
  { name: 'catalog-course-missing', path: '/cursos/no-existe' }
]
