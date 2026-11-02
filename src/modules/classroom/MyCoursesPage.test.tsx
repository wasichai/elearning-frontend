import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import type { WasichaiModule } from '@wasichai/core'
import { Link } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { classroomModule } from './module'
import { MyCoursesPage } from './MyCoursesPage'
import { assessmentClassroom, assessmentSummary, classroom, enrollment, finishedEnrollment, otherEnrollment, problem, sessions } from './test/fixtures'

const ENROLLMENTS = '/lms/classroom/enrollments'
const SESSIONS = /^\/lms\/classroom\/enrollments\/[^/]+\/sessions$/
const CLASSROOM = /^\/lms\/classroom\/enrollments\/[^/]+$/
// lo que lee el riel de cada matrícula activa: por defecto, un aula sin evaluaciones y ninguna sesión
const RAIL: MockRoute[] = [
  { path: SESSIONS, body: [] },
  { path: CLASSROOM, body: classroom }
]
let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

// el catálogo es otro módulo: para el enlace del estado vacío basta registrar una ruta con su clave
const catalogStub: WasichaiModule = { id: 'catalog', routes: [{ id: 'courses', path: 'cursos', chrome: 'public', component: () => null }] }

function renderPage(routes: MockRoute[], modules: WasichaiModule[] = [classroomModule(), catalogStub]) {
  fetchMock = mockFetch([...routes, ...RAIL])
  return renderWithProviders(<MyCoursesPage />, { modules, route: '/mis-cursos', permissions: { admin: false, objects: {} } })
}

const DAY = 24 * 3600 * 1000
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString().replace(/\.\d+Z$/, 'Z')
// una sesión a la fecha que pida la prueba; las de los ejemplos tienen fecha fija y dejarían de ser futuras
const liveSession = (id: string, start: string, title = 'Sesión') => ({
  ...sessions[2],
  id,
  title,
  start,
  end: new Date(Date.parse(start) + 3600 * 1000).toISOString().replace(/\.\d+Z$/, 'Z'),
  lessonId: null,
  originalSessionId: null
})

const item = (title: string) => screen.getByRole('heading', { level: 3, name: title }).closest('article')!

describe('MyCoursesPage', () => {
  it('dice que está cargando mientras llega la respuesta', async () => {
    renderPage([{ path: ENROLLMENTS, body: [enrollment] }])

    expect(screen.getByText('Cargando tus cursos…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 3, name: enrollment.course.title })).toBeInTheDocument()
  })

  it('pinta cada matrícula con su edición en su zona, su progreso y «Continuar» a la siguiente lección', async () => {
    renderPage([{ path: ENROLLMENTS, body: [enrollment, otherEnrollment] }])

    expect(screen.getByRole('heading', { level: 1, name: 'Mis cursos' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 3, name: enrollment.course.title })).toBeInTheDocument()
    const card = within(item(enrollment.course.title))
    expect(card.getByRole('link', { name: enrollment.course.title })).toHaveAttribute('href', '/mis-cursos/mat-srtm-1')
    expect(card.getByText('9 nov – 4 dic 2026')).toBeInTheDocument()
    expect(card.getByText(/· Aún no empieza$/)).toBeInTheDocument()
    expect(card.getByText(/^Fechas en hora .*Perú$/)).toBeInTheDocument()

    const bar = card.getByRole('progressbar', { name: 'Progreso del curso' })
    expect(bar).toHaveAttribute('aria-valuenow', '33')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
    expect(bar).toHaveAttribute('aria-valuetext', '1 de 3 lecciones completadas, 33 %')
    expect(card.getByText('1 de 3 lecciones · 33 %')).toBeInTheDocument()
    // el avance se dibuja como quipu: un nudo de lección por lección, con el texto de siempre
    const knots = [...bar.querySelectorAll('[data-knot]')]
    expect(knots.map((knot) => knot.getAttribute('data-state'))).toEqual(['done', 'todo', 'todo'])
    expect(knots.every((knot) => knot.getAttribute('data-knot') === 'lesson')).toBe(true)

    expect(card.getByText('Siguiente: Recorrido por la pantalla')).toBeInTheDocument()
    const next = card.getByRole('link', { name: 'Continuar «Licencias de anuncios con SRTM»' })
    expect(next).toHaveTextContent('Continuar')
    expect(next).toHaveAttribute('href', '/mis-cursos/mat-srtm-1?leccion=lec-video')

    expect(within(item(otherEnrollment.course.title)).getByText(/· En curso$/)).toBeInTheDocument()
    // un «Continuar» por curso, cada uno con su nombre accesible
    expect(screen.getAllByRole('link', { name: /^Continuar/ })).toHaveLength(2)
  })

  it('sin siguiente lección ofrece repasar el curso', async () => {
    renderPage([{ path: ENROLLMENTS, body: [finishedEnrollment] }])

    expect(await screen.findByRole('heading', { level: 3, name: finishedEnrollment.course.title })).toBeInTheDocument()
    const card = within(item(finishedEnrollment.course.title))
    expect(card.getByText('Has completado todas las lecciones disponibles.')).toBeInTheDocument()
    expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(card.getByRole('link', { name: 'Repasar «Tributos locales»' })).toHaveAttribute('href', '/mis-cursos/mat-done-1')
    expect(card.queryByRole('link', { name: /^Continuar/ })).not.toBeInTheDocument()
  })

  it('con certificado lo dice con una insignia de completado y enlaza al certificado', async () => {
    renderPage([{ path: ENROLLMENTS, body: [{ ...finishedEnrollment, certificateCode: 'K7Q2-M9XW-4RTB' }] }])

    await screen.findByRole('heading', { level: 3, name: finishedEnrollment.course.title })
    const card = within(item(finishedEnrollment.course.title))
    expect(card.getByText('Certificado emitido').closest('[data-slot="badge"]')).toHaveAttribute('data-state', 'achievement')
    expect(card.getByRole('link', { name: 'Ver el certificado de «Tributos locales»' })).toHaveAttribute('href', '/certificados/K7Q2-M9XW-4RTB')
  })

  it('sin matrículas, lleva al catálogo', async () => {
    renderPage([{ path: ENROLLMENTS, body: [] }])

    expect(await screen.findByText('Todavía no estás matriculado en ningún curso')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver el catálogo' })).toHaveAttribute('href', '/cursos')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('sin el catálogo registrado, el estado vacío no enlaza a una ruta que no existe', async () => {
    renderPage([{ path: ENROLLMENTS, body: [] }], [classroomModule()])

    expect(await screen.findByText('Todavía no estás matriculado en ningún curso')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('un error del servidor se explica y «Reintentar» lo recupera', async () => {
    renderPage([{ path: ENROLLMENTS, status: 503, body: problem(503, 'caído') }])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar tus cursos')
    expect(alert).toHaveTextContent('error 503')

    fetchMock.restore()
    fetchMock = mockFetch([{ path: ENROLLMENTS, body: [enrollment] }, ...RAIL])
    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { level: 3, name: enrollment.course.title })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('una respuesta fuera de contrato no pinta datos a medias', async () => {
    renderPage([{ path: ENROLLMENTS, body: [{ ...enrollment, progress: { completedLessons: 1 } }] }])

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos leer la respuesta del servidor')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  // el menú lleva a la misma ruta: la página no se vuelve a montar y solo cambia la entrada del historial (#76)
  it('con la lista abierta, volver a pulsar su entrada del menú la vuelve a pedir y pinta lo nuevo', async () => {
    const routes: MockRoute[] = [{ path: ENROLLMENTS, body: [enrollment] }, ...RAIL]
    fetchMock = mockFetch(routes)
    renderWithProviders(
      <>
        <Link to="/mis-cursos">Menú</Link>
        <MyCoursesPage />
      </>,
      { modules: [classroomModule(), catalogStub], permissions: { admin: false, objects: {} }, route: '/mis-cursos' }
    )
    expect(await screen.findAllByRole('article')).toHaveLength(1)
    expect(fetchMock.calls.filter((call) => call.path === ENROLLMENTS)).toHaveLength(1)

    routes[0] = { path: ENROLLMENTS, body: [enrollment, otherEnrollment] }
    await userEvent.click(screen.getByRole('link', { name: 'Menú' }))

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2))
    expect(fetchMock.calls.filter((call) => call.path === ENROLLMENTS)).toHaveLength(2)
  })
  it('saluda con el nombre real y sin datos de la semana no se los inventa', async () => {
    renderPage([{ path: ENROLLMENTS, body: [enrollment] }])

    expect(await screen.findByRole('heading', { level: 3, name: enrollment.course.title })).toBeInTheDocument()
    expect(screen.getByText(/^Hola, Tester\./)).toBeInTheDocument()
    await waitFor(() => expect(fetchMock.calls.some((call) => SESSIONS.test(call.path))).toBe(true))
    expect(screen.queryByText(/próximos 7 días/)).not.toBeInTheDocument()
  })

  it('el saludo dice cuántas sesiones hay en los próximos 7 días', async () => {
    renderPage([
      { path: ENROLLMENTS, body: [enrollment] },
      {
        path: `${ENROLLMENTS}/${enrollment.id}/sessions`,
        body: [
          liveSession('ses-pronto', inDays(2)),
          liveSession('ses-luego', inDays(3)),
          liveSession('ses-lejos', inDays(30)),
          { ...liveSession('ses-cancelada', inDays(1)), status: 'CANCELADA' }
        ]
      }
    ])

    expect(await screen.findByText(/^Hola, Tester\. Tienes 2 sesiones en vivo en los próximos 7 días\.$/)).toBeInTheDocument()
  })

  it('si no se pudieron leer las sesiones, el saludo no cuenta las que sí llegaron', async () => {
    renderPage([
      { path: ENROLLMENTS, body: [enrollment, otherEnrollment] },
      { path: `${ENROLLMENTS}/${enrollment.id}/sessions`, body: [liveSession('ses-pronto', inDays(2))] },
      { path: `${ENROLLMENTS}/${otherEnrollment.id}/sessions`, status: 503, body: problem(503, 'caído') }
    ])

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tus próximas sesiones')
    expect(screen.queryByText(/próximos 7 días/)).not.toBeInTheDocument()
  })

  it('«Continuar aprendiendo» lleva a la lección exacta, con la única primaria de la pantalla', async () => {
    renderPage([{ path: ENROLLMENTS, body: [otherEnrollment, enrollment] }])

    const hero = within(await screen.findByRole('region', { name: 'Continuar aprendiendo' }))
    // la de avance gana, aunque el servidor ponga antes otra sin empezar
    expect(hero.getByRole('heading', { level: 3, name: enrollment.course.title })).toBeInTheDocument()
    expect(hero.getByText('Unidad 1 · Lección 2')).toBeInTheDocument()
    expect(hero.getByText('Siguiente: Recorrido por la pantalla')).toBeInTheDocument()
    expect(hero.getByText('1 de 3 lecciones · 33 %')).toBeInTheDocument()

    const primaries = document.querySelectorAll('[data-slot="button"][data-variant="primary"]')
    expect([...primaries].map((button) => button.getAttribute('aria-label'))).toEqual(['Continuar «Licencias de anuncios con SRTM»'])

    const others = within(screen.getByRole('region', { name: 'Otros cursos en curso' }))
    expect(others.getByRole('link', { name: 'Continuar «Introducción al SGSPE»' })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1?leccion=lec-sgspe-1')
  })

  it('sin nada que continuar, no hay bloque ni primaria', async () => {
    renderPage([{ path: ENROLLMENTS, body: [finishedEnrollment] }])

    await screen.findByRole('heading', { level: 3, name: finishedEnrollment.course.title })
    expect(screen.queryByRole('region', { name: 'Continuar aprendiendo' })).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="button"][data-variant="primary"]')).toHaveLength(0)
  })

  it('separa en curso, completados y retirados, sin perder ninguna matrícula', async () => {
    const certified = { ...finishedEnrollment, status: 'FINALIZADA', certificateCode: 'K7Q2-M9XW-4RTB' }
    const withdrawn = { ...otherEnrollment, id: 'mat-ret', status: 'RETIRADA', course: { ...otherEnrollment.course, title: 'Curso dejado' } }
    renderPage([{ path: ENROLLMENTS, body: [enrollment, otherEnrollment, certified, withdrawn] }])

    const completed = within(await screen.findByRole('region', { name: 'Completados' }))
    expect(completed.getByRole('heading', { name: finishedEnrollment.course.title })).toBeInTheDocument()
    expect(completed.getByRole('link', { name: 'Ver el certificado de «Tributos locales»' })).toHaveAttribute('href', '/certificados/K7Q2-M9XW-4RTB')
    expect(completed.getByText('Certificado emitido').closest('[data-slot="badge"]')).toHaveAttribute('data-state', 'achievement')

    // RETIRADA: el aula responde 404, así que se ve sin enlace
    const gone = within(screen.getByRole('region', { name: 'Retirados' }))
    expect(gone.getByRole('heading', { name: 'Curso dejado' })).toBeInTheDocument()
    expect(gone.getByText('Retirada').closest('[data-slot="badge"]')).toBeInTheDocument()
    expect(gone.queryByRole('link')).not.toBeInTheDocument()

    const figures = within(screen.getByRole('complementary', { name: 'Tu resumen' }))
    expect(figures.getByText('En curso').nextElementSibling).toHaveTextContent('2')
    expect(figures.getByText('Completados').nextElementSibling).toHaveTextContent('1')
  })

  it('un curso sin lecciones disponibles no se da por completado', async () => {
    renderPage([{ path: ENROLLMENTS, body: [{ ...enrollment, progress: { completedLessons: 0, totalLessons: 0, percent: 0 }, nextLesson: null }] }])

    await screen.findByRole('heading', { level: 3, name: enrollment.course.title })
    expect(screen.queryByRole('region', { name: 'Completados' })).not.toBeInTheDocument()
    expect(screen.getByText('Este curso todavía no tiene lecciones disponibles.')).toBeInTheDocument()
    expect(screen.queryByText('Has completado todas las lecciones disponibles.')).not.toBeInTheDocument()
  })

  it('el riel muestra las sesiones futuras con día, hora y zona, y enlaza a las del curso', async () => {
    const start = inDays(3)
    renderPage([
      { path: ENROLLMENTS, body: [enrollment] },
      {
        path: `${ENROLLMENTS}/${enrollment.id}/sessions`,
        body: [
          liveSession('ses-futura', start, 'Consulta de la unidad'),
          { ...liveSession('ses-cancelada', inDays(1), 'Cancelada'), status: 'CANCELADA' },
          liveSession('ses-pasada', inDays(-2), 'Pasada')
        ]
      }
    ])

    const block = within(await screen.findByRole('region', { name: 'Próximas sesiones' }))
    const row = await block.findByRole('link', { name: /Consulta de la unidad/ })
    expect(row).toHaveAttribute('href', `/mis-cursos/${enrollment.id}/sesiones`)
    const weekday = new Intl.DateTimeFormat('es', { weekday: 'short', timeZone: 'America/Lima' }).format(new Date(start)).replace('.', '')
    expect(within(row).getByText(new RegExp(`^${weekday}`, 'i')).tagName).toBe('TIME')
    expect(within(row).getByText(new RegExp(`^${weekday}`, 'i'))).toHaveAttribute('datetime', start)
    expect(block.getByText(/^Horas en .*Perú$/)).toBeInTheDocument()
    expect(block.queryByText('Cancelada')).not.toBeInTheDocument()
    expect(block.queryByText('Pasada')).not.toBeInTheDocument()
  })

  it('sin sesiones ni evaluaciones, cada bloque lo dice en una línea', async () => {
    renderPage([{ path: ENROLLMENTS, body: [enrollment] }])

    expect(await within(await screen.findByRole('region', { name: 'Próximas sesiones' })).findByText('Nada programado')).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Evaluaciones pendientes' })).findByText('Nada pendiente')).toBeInTheDocument()
  })

  it('el riel muestra las evaluaciones pendientes con lo que queda, sin plazos', async () => {
    renderPage([
      { path: ENROLLMENTS, body: [{ ...otherEnrollment }] },
      { path: `${ENROLLMENTS}/${otherEnrollment.id}`, body: assessmentClassroom }
    ])

    const block = within(await screen.findByRole('region', { name: 'Evaluaciones pendientes' }))
    const row = await block.findByRole('link', { name: new RegExp(assessmentSummary.title) })
    expect(row).toHaveAttribute('href', `/mis-cursos/${otherEnrollment.id}?leccion=lec-eva`)
    expect(within(row).getByText('Quedan 2 intentos')).toBeInTheDocument()
  })

  it('una matrícula finalizada no se lee para el riel', async () => {
    renderPage([{ path: ENROLLMENTS, body: [{ ...finishedEnrollment, status: 'FINALIZADA' }] }])

    await screen.findByRole('heading', { level: 3, name: finishedEnrollment.course.title })
    expect(fetchMock.calls.filter((call) => call.path !== ENROLLMENTS && call.path.includes('/classroom/'))).toEqual([])
    expect(screen.queryByRole('region', { name: 'Próximas sesiones' })).not.toBeInTheDocument()
  })

  it('con más matrículas que el tope, solo lee hasta el tope y lo dice', async () => {
    const many = Array.from({ length: 8 }, (_, index) => ({ ...enrollment, id: `mat-${index}` }))
    renderPage([{ path: ENROLLMENTS, body: many }])

    expect(await screen.findByText('Se revisan tus primeros 6 cursos en curso.')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock.calls.filter((call) => SESSIONS.test(call.path))).toHaveLength(6))
    expect(fetchMock.calls.filter((call) => CLASSROOM.test(call.path))).toHaveLength(6)
  })

  it('un fallo de las sesiones degrada solo su bloque, lo dice y «Reintentar» lo recupera', async () => {
    const routes: MockRoute[] = [
      { path: ENROLLMENTS, body: [enrollment, otherEnrollment] },
      { path: SESSIONS, status: 503, body: problem(503, 'caído') },
      { path: `${ENROLLMENTS}/${otherEnrollment.id}`, body: assessmentClassroom }
    ]
    renderPage(routes)

    const block = within(await screen.findByRole('region', { name: 'Próximas sesiones' }))
    const alert = await block.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar tus próximas sesiones')
    // el resto del panel sigue
    expect(screen.getByRole('region', { name: 'Continuar aprendiendo' })).toBeInTheDocument()
    expect(
      await within(screen.getByRole('region', { name: 'Evaluaciones pendientes' })).findByRole('link', { name: new RegExp(assessmentSummary.title) })
    ).toBeInTheDocument()
    expect(screen.getAllByRole('alert')).toHaveLength(1)

    fetchMock.restore()
    fetchMock = mockFetch([
      { path: `${ENROLLMENTS}/${enrollment.id}/sessions`, body: [liveSession('ses-vuelta', inDays(2), 'Sesión recuperada')] },
      { path: SESSIONS, body: [] },
      ...RAIL
    ])
    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar las sesiones' }))

    expect(await block.findByRole('link', { name: /Sesión recuperada/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    // solo se vuelve a pedir lo que falló
    expect(fetchMock.calls.filter((call) => CLASSROOM.test(call.path))).toEqual([])
  })

  it('si falla una sola aula, su bloque avisa de que puede estar incompleto y muestra lo demás', async () => {
    renderPage([
      { path: ENROLLMENTS, body: [enrollment, otherEnrollment] },
      { path: `${ENROLLMENTS}/${enrollment.id}`, status: 500, body: problem(500, 'caído') },
      { path: `${ENROLLMENTS}/${otherEnrollment.id}`, body: assessmentClassroom }
    ])

    const block = within(await screen.findByRole('region', { name: 'Evaluaciones pendientes' }))
    const alert = await block.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar todas tus evaluaciones')
    expect(alert).toHaveTextContent('Lo que ves puede estar incompleto.')
    expect(await block.findByRole('link', { name: new RegExp(assessmentSummary.title) })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Próximas sesiones' })).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('volver a pulsar el menú también vuelve a pedir lo del riel', async () => {
    fetchMock = mockFetch([{ path: ENROLLMENTS, body: [enrollment] }, ...RAIL])
    renderWithProviders(
      <>
        <Link to="/mis-cursos">Menú</Link>
        <MyCoursesPage />
      </>,
      { modules: [classroomModule(), catalogStub], permissions: { admin: false, objects: {} }, route: '/mis-cursos' }
    )
    await waitFor(() => expect(fetchMock.calls.filter((call) => SESSIONS.test(call.path))).toHaveLength(1))

    await userEvent.click(screen.getByRole('link', { name: 'Menú' }))

    await waitFor(() => expect(fetchMock.calls.filter((call) => SESSIONS.test(call.path))).toHaveLength(2))
    expect(fetchMock.calls.filter((call) => CLASSROOM.test(call.path))).toHaveLength(2)
  })
})
