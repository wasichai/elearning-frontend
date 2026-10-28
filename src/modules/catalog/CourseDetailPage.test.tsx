import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes } from 'react-router'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { CourseDetailPage, LONG_SYLLABUS } from './CourseDetailPage'
import { catalogModule } from './module'
import { courseDetail, problem } from './test/fixtures'

const COURSE = '/lms/public/catalog/courses/srtm-anuncios'
let fetchMock: FetchMock

afterEach(() => fetchMock?.restore())

function renderCourse(routes: MockRoute[], route = '/cursos/srtm-anuncios') {
  fetchMock = mockFetch(routes)
  return renderWithProviders(
    <Routes>
      <Route path="/cursos" element={<p>catálogo</p>} />
      <Route path="/cursos/:slug" element={<CourseDetailPage />} />
    </Routes>,
    { modules: [catalogModule()], route, user: null, permissions: null }
  )
}

const section = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('section')!

describe('CourseDetailPage', () => {
  it('pinta la ficha completa', async () => {
    renderCourse([{ path: COURSE, body: courseDetail }])

    expect(await screen.findByRole('heading', { level: 1, name: courseDetail.title })).toBeInTheDocument()
    expect(screen.getByText(courseDetail.summary)).toBeInTheDocument()
    expect(screen.getByText('Contenido ilustrativo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Catálogo' })).toHaveAttribute('href', '/cursos')
    expect(screen.getByText('6 semanas · 216 h')).toBeInTheDocument()
    expect(screen.getByText('español')).toBeInTheDocument()
    expect(screen.getByText(/^1, publicada el 20 oct 2026$/)).toBeInTheDocument()

    expect(within(section('Qué aprenderás')).getByText('Registrar una solicitud de licencia')).toBeInTheDocument()
    expect(within(section('Qué aprenderás')).getByText('Tramita una licencia de anuncio de principio a fin')).toBeInTheDocument()
    expect(within(section('Antes de empezar')).getByText('Manejo básico de hoja de cálculo.')).toBeInTheDocument()
    expect(within(section('Antes de empezar')).getByText('Cuenta de usuario en SRTM de pruebas.')).toBeInTheDocument()

    const syllabus = within(section('Temario'))
    expect(syllabus.getByRole('heading', { level: 3, name: 'Unidad 1. El trámite de anuncios' })).toBeInTheDocument()
    expect(syllabus.getByText('2 lecciones · 6 h estimadas')).toBeInTheDocument()
    expect(syllabus.getByText('Lectura · 30 min')).toBeVisible()
    expect(syllabus.getByText('Vídeo · 15 min')).toBeVisible()

    const offerings = within(section('Ediciones'))
    expect(offerings.getByText('Inscripción abierta')).toBeInTheDocument()
    expect(offerings.getByText('15 oct – 6 nov 2026')).toBeInTheDocument()
    expect(offerings.getByText('30 plazas')).toBeInTheDocument()
    expect(offerings.getByText('Martes y jueves, 18:00–20:00')).toBeInTheDocument()
    expect(offerings.getByText(/\(America\/Lima\)$/)).toBeInTheDocument()
    expect(offerings.getByText('Ana Quispe (titular)')).toBeInTheDocument()

    expect(within(section('Docentes')).getByText('Diez años en rentas municipales.')).toBeInTheDocument()

    const workload = within(section('Carga de trabajo y créditos'))
    const table = workload.getByRole('table', { name: 'Horas en 6 semanas' })
    expect(within(table).getByRole('row', { name: 'Teoría 12 72' })).toBeInTheDocument()
    expect(within(table).getByRole('row', { name: 'Supervisadas 0 0' })).toBeInTheDocument()
    expect(within(table).getByRole('row', { name: 'Total 36 216' })).toBeInTheDocument()
    // horas de contacto y dirigidas
    expect(workload.getAllByText('144 h', { selector: 'dd' })).toHaveLength(2)

    expect(within(section('Evaluación y certificación')).getByText('Constancia de participación.')).toBeInTheDocument()
    expect(within(section('Fuentes')).getByText('Manual de usuario SRTM, módulo de anuncios')).toBeInTheDocument()
  })

  it('créditos propuestos: dice que no son oficiales y enseña el método solo bajo demanda', async () => {
    const user = userEvent.setup()
    renderCourse([{ path: COURSE, body: courseDetail }])

    expect(await screen.findByText('8 créditos ECTS propuestos — no oficiales')).toBeInTheDocument()
    const method = screen.getByText(courseDetail.credits.proposal.method)
    expect(method).not.toBeVisible()
    expect(screen.queryByText('Avisos de la propuesta')).not.toBeInTheDocument()

    await user.click(screen.getByText('Cómo se calculó'))

    expect(method).toBeVisible()
    expect(screen.getByText('Guía ECTS 2015, sección 4')).toBeVisible()
    expect(screen.getByText('horasPorCredito = 27, paso = 0.5')).toBeVisible()
    expect(screen.getByText('ects-carga-total, versión 1')).toBeVisible()
  })

  it('muestra los avisos de la propuesta', async () => {
    const proposal = { ...courseDetail.credits.proposal, calculated: 7.6, proposed: 7.5, warnings: ['La carga no es múltiplo exacto de las horas por crédito'] }
    renderCourse([{ path: COURSE, body: { ...courseDetail, credits: { ...courseDetail.credits, proposal } } }])

    expect(await screen.findByText('7,5 créditos ECTS propuestos — no oficiales')).toBeInTheDocument()
    expect(screen.getByText('La carga no es múltiplo exacto de las horas por crédito')).toBeVisible()
  })

  it('créditos aprobados: solo la cifra aprobada, sin «no oficiales»', async () => {
    renderCourse([{ path: COURSE, body: { ...courseDetail, credits: { ...courseDetail.credits, approved: 7.5 } } }])

    expect(await screen.findByText('Créditos aprobados: 7,5 ECTS')).toBeInTheDocument()
    expect(screen.queryByText(/no oficial/)).not.toBeInTheDocument()
    expect(screen.queryByText('Cómo se calculó')).not.toBeInTheDocument()
  })

  it('sin sistema de créditos no habla de créditos', async () => {
    renderCourse([{ path: COURSE, body: { ...courseDetail, credits: { system: null, approved: null, proposal: null } } }])

    expect(await screen.findByRole('heading', { level: 2, name: 'Carga de trabajo' })).toBeInTheDocument()
    expect(screen.queryByText(/crédito/i)).not.toBeInTheDocument()
  })

  it('un temario largo pliega las lecciones de cada unidad en un desplegable nativo', async () => {
    const user = userEvent.setup()
    const lessons = Array.from({ length: LONG_SYLLABUS + 1 }, (_, index) => ({
      ...courseDetail.units[0]!.lessons[0]!,
      order: index + 1,
      title: `Lección ${index + 1}`
    }))
    renderCourse([{ path: COURSE, body: { ...courseDetail, units: [{ ...courseDetail.units[0], lessons }] } }])

    const lesson = await screen.findByText('Lección 1')
    expect(lesson).not.toBeVisible()

    // <details>/<summary> nativo: el navegador lo abre con Enter o Espacio; jsdom solo implementa el clic
    const toggle = screen.getByText(`Ver las ${LONG_SYLLABUS + 1} lecciones`)
    expect(toggle.tagName).toBe('SUMMARY')
    await user.click(toggle)

    expect(lesson).toBeVisible()
  })

  it('un 404 es «Curso no encontrado» con vuelta al catálogo', async () => {
    const user = userEvent.setup()
    renderCourse([{ path: '/lms/public/catalog/courses/no-existe', status: 404, body: problem(404, 'Curso no encontrado') }], '/cursos/no-existe')

    expect(await screen.findByRole('heading', { level: 1, name: 'Curso no encontrado' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: '← Catálogo' }))

    expect(await screen.findByText('catálogo')).toBeInTheDocument()
  })

  it('un error del servidor se explica y se puede reintentar', async () => {
    const user = userEvent.setup()
    renderCourse([{ path: COURSE, status: 503, body: problem(503, 'Service Unavailable') }])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar el curso')
    expect(alert).toHaveTextContent('error 503')

    fetchMock.restore()
    fetchMock = mockFetch([{ path: COURSE, body: courseDetail }])
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { level: 1, name: courseDetail.title })).toBeInTheDocument()
  })

  it('una ficha fuera de contrato no se pinta a medias', async () => {
    renderCourse([{ path: COURSE, body: { ...courseDetail, credits: { ...courseDetail.credits, system: 'SCH' } } }])

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos leer la respuesta del servidor')
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })
})

// el navegador en UTC+14: una fecha civil tratada como medianoche local o UTC cambiaría de día en zonas lejanas
describe('CourseDetailPage con el navegador en otra zona horaria', () => {
  const browserZone = process.env.TZ

  beforeAll(() => {
    process.env.TZ = 'Pacific/Kiritimati'
  })

  afterAll(() => {
    process.env.TZ = browserZone
  })

  it('escribe las fechas de cada edición en la zona de la edición', async () => {
    expect(new Date('2026-11-09T00:00:00Z').getTimezoneOffset()).toBe(-14 * 60)
    const lima = courseDetail.offerings[0]!
    const pagoPago = {
      ...lima,
      code: 'edicion-samoa',
      status: 'PROGRAMADA',
      enrollmentOpen: false,
      timeZone: 'Pacific/Pago_Pago',
      startDate: '2027-01-04',
      endDate: '2027-01-29',
      enrollmentFrom: null,
      enrollmentUntil: '2027-01-01'
    }
    renderCourse([{ path: COURSE, body: { ...courseDetail, offerings: [lima, pagoPago] } }])

    await screen.findByRole('heading', { level: 1, name: courseDetail.title })
    const [first, second] = within(section('Ediciones')).getAllByRole('listitem')
    expect(within(first!).getByRole('heading', { level: 3 })).toHaveTextContent('9 nov – 4 dic 2026')
    expect(within(first!).getByText('15 oct – 6 nov 2026')).toBeInTheDocument()
    expect(within(second!).getByRole('heading', { level: 3 })).toHaveTextContent('4–29 ene 2027')
    expect(within(second!).getByRole('heading', { level: 3 })).toHaveTextContent('Inscripción aún no abierta')
    expect(within(second!).getByText('hasta el 1 ene 2027')).toBeInTheDocument()
    expect(within(second!).getByText(/\(Pacific\/Pago_Pago\)$/)).toBeInTheDocument()
  })
})
