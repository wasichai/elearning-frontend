import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import type { WasichaiModule } from '@wasichai/core'
import { Link } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { classroomModule } from './module'
import { MyCoursesPage } from './MyCoursesPage'
import { PANEL_PAGE_SIZE } from '../../shared/pages'
import { assessmentSummary, enrollment, finishedEnrollment, otherEnrollment, panelItem, problem, sessions } from './test/fixtures'

const ENROLLMENTS = '/lms/classroom/enrollments'
const PANEL = '/lms/classroom/panel'
// lo que el panel ya trae y antes se leía aparte por matrícula: su aula o sus sesiones
const PER_ENROLLMENT = /^\/lms\/classroom\/enrollments\/./
const pageOf = (page: number) => new RegExp(`^/lms/classroom/panel\\?page=${page}&size=${PANEL_PAGE_SIZE}$`)
const panelOf = (...items: object[]): MockRoute => ({ path: PANEL, body: items.map((item) => ('upcomingSessions' in item ? item : panelItem(item))) })
const panelDown = (status = 503): MockRoute => ({ path: PANEL, status, body: problem(status, 'caído') })
const pendingAssessment = { lessonId: 'lec-eva', assessment: assessmentSummary }
let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

// el catálogo es otro módulo: para el enlace del estado vacío basta registrar una ruta con su clave
const catalogStub: WasichaiModule = { id: 'catalog', routes: [{ id: 'courses', path: 'cursos', chrome: 'public', component: () => null }] }

function renderPage(routes: MockRoute[], modules: WasichaiModule[] = [classroomModule(), catalogStub]) {
  fetchMock = mockFetch(routes)
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

const called = (path: string) => fetchMock.calls.filter((call) => call.path.split('?')[0] === path).length
const item = (title: string) => screen.getByRole('heading', { level: 3, name: title }).closest('article')!

describe('MyCoursesPage', () => {
  it('dice que está cargando mientras llega la respuesta', async () => {
    renderPage([panelOf(enrollment)])

    expect(screen.getByText('Cargando tus cursos…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 3, name: enrollment.course.title })).toBeInTheDocument()
  })

  it('pinta cada matrícula con su edición en su zona, su progreso y «Continuar» a la siguiente lección', async () => {
    renderPage([panelOf(enrollment, otherEnrollment)])

    expect(screen.getByRole('heading', { level: 1, name: 'Mis cursos' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 3, name: enrollment.course.title })).toBeInTheDocument()
    const card = within(item(enrollment.course.title))
    expect(card.getByRole('link', { name: enrollment.course.title })).toHaveAttribute('href', '/mis-cursos/mat-srtm-1')
    expect(card.getByText('9 nov – 4 dic 2026')).toBeInTheDocument()
    expect(card.getByText(/· Aún no empieza$/)).toBeInTheDocument()
    // todas en la misma zona: se dice una vez por página, no en cada tarjeta
    expect(card.queryByText(/Perú/)).not.toBeInTheDocument()
    expect(screen.getAllByText(/^Fechas y horas en hora .*Perú$/)).toHaveLength(1)

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
    renderPage([panelOf(finishedEnrollment)])

    expect(await screen.findByRole('heading', { level: 3, name: finishedEnrollment.course.title })).toBeInTheDocument()
    const card = within(item(finishedEnrollment.course.title))
    expect(card.getByText('Has completado todas las lecciones disponibles.')).toBeInTheDocument()
    expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(card.getByRole('link', { name: 'Repasar «Tributos locales»' })).toHaveAttribute('href', '/mis-cursos/mat-done-1')
    expect(card.queryByRole('link', { name: /^Continuar/ })).not.toBeInTheDocument()
  })

  it('con certificado lo dice con una insignia de completado y enlaza al certificado', async () => {
    renderPage([panelOf({ ...finishedEnrollment, certificateCode: 'K7Q2-M9XW-4RTB' })])

    await screen.findByRole('heading', { level: 3, name: finishedEnrollment.course.title })
    const card = within(item(finishedEnrollment.course.title))
    expect(card.getByText('Certificado emitido').closest('[data-slot="badge"]')).toHaveAttribute('data-state', 'achievement')
    expect(card.getByRole('link', { name: 'Ver el certificado de «Tributos locales»' })).toHaveAttribute('href', '/certificados/K7Q2-M9XW-4RTB')
  })

  it('sin matrículas, lleva al catálogo', async () => {
    renderPage([panelOf()])

    expect(await screen.findByText('Todavía no estás matriculado en ningún curso')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver el catálogo' })).toHaveAttribute('href', '/cursos')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('sin el catálogo registrado, el estado vacío no enlaza a una ruta que no existe', async () => {
    renderPage([panelOf()], [classroomModule()])

    expect(await screen.findByText('Todavía no estás matriculado en ningún curso')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('un error del servidor se explica y «Reintentar» lo recupera', async () => {
    renderPage([panelDown(), { path: ENROLLMENTS, status: 503, body: problem(503, 'caído') }])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar tus cursos')
    expect(alert).toHaveTextContent('error 503')

    fetchMock.restore()
    fetchMock = mockFetch([panelOf(enrollment)])
    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { level: 3, name: enrollment.course.title })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('una respuesta fuera de contrato no pinta datos a medias', async () => {
    renderPage([
      panelOf({ ...enrollment, progress: { completedLessons: 1 } }),
      { path: ENROLLMENTS, body: [{ ...enrollment, progress: { completedLessons: 1 } }] }
    ])

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos leer la respuesta del servidor')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  // el menú lleva a la misma ruta: la página no se vuelve a montar y solo cambia la entrada del historial (#76)
  it('con la lista abierta, volver a pulsar su entrada del menú la vuelve a pedir y pinta lo nuevo', async () => {
    const routes: MockRoute[] = [panelOf(enrollment)]
    fetchMock = mockFetch(routes)
    renderWithProviders(
      <>
        <Link to="/mis-cursos">Menú</Link>
        <MyCoursesPage />
      </>,
      { modules: [classroomModule(), catalogStub], permissions: { admin: false, objects: {} }, route: '/mis-cursos' }
    )
    expect(await screen.findAllByRole('article')).toHaveLength(1)
    expect(called(PANEL)).toBe(1)

    routes[0] = panelOf(enrollment, otherEnrollment)
    await userEvent.click(screen.getByRole('link', { name: 'Menú' }))

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2))
    expect(called(PANEL)).toBe(2)
  })

  it('saluda con el nombre real y sin datos de la semana no se los inventa', async () => {
    renderPage([panelOf(enrollment)])

    expect(await screen.findByRole('heading', { level: 3, name: enrollment.course.title })).toBeInTheDocument()
    expect(screen.getByText(/^Hola, Tester\./)).toBeInTheDocument()
    expect(screen.queryByText(/próximos 7 días/)).not.toBeInTheDocument()
  })

  it('el saludo dice cuántas sesiones hay en los próximos 7 días: el servidor las da todas, sin ese límite', async () => {
    renderPage([
      panelOf(
        panelItem(enrollment, {
          upcomingSessions: [liveSession('ses-pronto', inDays(2)), liveSession('ses-luego', inDays(3)), liveSession('ses-lejos', inDays(30))]
        })
      )
    ])

    expect(await screen.findByText(/^Hola, Tester\. Tienes 2 sesiones en vivo en los próximos 7 días\.$/)).toBeInTheDocument()
  })

  it('si no se pudo leer el panel, el saludo no cuenta sesiones', async () => {
    renderPage([panelDown(), { path: ENROLLMENTS, body: [enrollment, otherEnrollment] }])

    expect(await screen.findByText('No pudimos cargar tus próximas sesiones.')).toBeInTheDocument()
    expect(screen.getByText(/^Hola, Tester\./)).toBeInTheDocument()
    expect(screen.queryByText(/próximos 7 días/)).not.toBeInTheDocument()
  })

  it('«Continuar aprendiendo» lleva a la lección exacta, con la única primaria de la pantalla', async () => {
    renderPage([panelOf(otherEnrollment, enrollment)])

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
    renderPage([panelOf(finishedEnrollment)])

    await screen.findByRole('heading', { level: 3, name: finishedEnrollment.course.title })
    expect(screen.queryByRole('region', { name: 'Continuar aprendiendo' })).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="button"][data-variant="primary"]')).toHaveLength(0)
  })

  it('separa en curso, completados y retirados, sin perder ninguna matrícula', async () => {
    const certified = { ...finishedEnrollment, status: 'FINALIZADA', certificateCode: 'K7Q2-M9XW-4RTB' }
    const withdrawn = { ...otherEnrollment, id: 'mat-ret', status: 'RETIRADA', course: { ...otherEnrollment.course, title: 'Curso dejado' } }
    renderPage([panelOf(enrollment, otherEnrollment, certified, withdrawn)])

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
    renderPage([panelOf({ ...enrollment, progress: { completedLessons: 0, totalLessons: 0, percent: 0 }, nextLesson: null })])

    await screen.findByRole('heading', { level: 3, name: enrollment.course.title })
    expect(screen.queryByRole('region', { name: 'Completados' })).not.toBeInTheDocument()
    expect(screen.getByText('Este curso todavía no tiene lecciones disponibles.')).toBeInTheDocument()
    expect(screen.queryByText('Has completado todas las lecciones disponibles.')).not.toBeInTheDocument()
  })

  it('el riel muestra las sesiones futuras con día, hora y zona, y enlaza a las del curso', async () => {
    const start = inDays(3)
    renderPage([panelOf(panelItem(enrollment, { upcomingSessions: [liveSession('ses-futura', start, 'Consulta de la unidad')] }))])

    const block = within(await screen.findByRole('region', { name: 'Próximas sesiones' }))
    const row = await block.findByRole('link', { name: /Consulta de la unidad/ })
    expect(row).toHaveAttribute('href', `/mis-cursos/${enrollment.id}/sesiones`)
    const weekday = new Intl.DateTimeFormat('es', { weekday: 'short', timeZone: 'America/Lima' }).format(new Date(start)).replace('.', '')
    expect(within(row).getByText(new RegExp(`^${weekday}`, 'i')).tagName).toBe('TIME')
    expect(within(row).getByText(new RegExp(`^${weekday}`, 'i'))).toHaveAttribute('datetime', start)
    // la zona de sus horas es la de la página: el riel no la repite
    expect(block.queryByText(/^Horas en/)).not.toBeInTheDocument()
    expect(screen.getAllByText(/^Fechas y horas en hora .*Perú$/)).toHaveLength(1)
  })

  it('con ediciones en zonas distintas, cada tarjeta dice la suya y no hay nota de página', async () => {
    const madrid = { ...otherEnrollment, offering: { ...otherEnrollment.offering, timeZone: 'Europe/Madrid' } }
    renderPage([panelOf(enrollment, madrid)])

    await screen.findByRole('heading', { level: 3, name: enrollment.course.title })
    expect(within(item(enrollment.course.title)).getByText(/^Fechas en hora .*Perú$/)).toBeInTheDocument()
    expect(within(item(madrid.course.title)).getByText(/^Fechas en hora .*Europa central$/)).toBeInTheDocument()
    expect(screen.queryByText(/^Fechas y horas en/)).not.toBeInTheDocument()
  })

  it('funde las sesiones de todos los cursos, la más próxima primero, y deja fuera la que terminó con la página abierta', async () => {
    renderPage([
      panelOf(
        panelItem(enrollment, { upcomingSessions: [liveSession('ses-luego', inDays(5), 'Luego'), liveSession('ses-pasada', inDays(-2), 'Ya terminó')] }),
        panelItem(otherEnrollment, { upcomingSessions: [liveSession('ses-pronto', inDays(1), 'Pronto')] })
      )
    ])

    const block = within(await screen.findByRole('region', { name: 'Próximas sesiones' }))
    expect(block.getAllByRole('link').map((row) => row.querySelector('span')?.textContent)).toEqual(['Pronto', 'Luego'])
  })

  it('sin sesiones ni evaluaciones, cada bloque lo dice en una línea', async () => {
    renderPage([panelOf(enrollment)])

    expect(await within(await screen.findByRole('region', { name: 'Próximas sesiones' })).findByText('Nada programado')).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Evaluaciones pendientes' })).findByText('Nada pendiente')).toBeInTheDocument()
  })

  it('el riel muestra las evaluaciones pendientes con lo que queda, sin plazos', async () => {
    renderPage([panelOf(panelItem(otherEnrollment, { pendingAssessments: [pendingAssessment] }))])

    const block = within(await screen.findByRole('region', { name: 'Evaluaciones pendientes' }))
    const row = await block.findByRole('link', { name: new RegExp(assessmentSummary.title) })
    expect(row).toHaveAttribute('href', `/mis-cursos/${otherEnrollment.id}?leccion=lec-eva`)
    expect(within(row).getByText('Quedan 2 intentos')).toBeInTheDocument()
  })

  it.each([
    ['abierta', { openAttemptId: 'int-1' }, 'Intento abierto'],
    ['en corrección', { best: { percent: null, passed: null, pending: true } }, 'En corrección']
  ])('una evaluación %s lo dice', async (_case, overrides, text) => {
    renderPage([panelOf(panelItem(enrollment, { pendingAssessments: [{ lessonId: 'lec-eva', assessment: { ...assessmentSummary, ...overrides } }] }))])

    const block = within(await screen.findByRole('region', { name: 'Evaluaciones pendientes' }))
    expect(await block.findByText(text)).toBeInTheDocument()
  })

  it('una matrícula finalizada o con certificado no entra en el riel, aunque el servidor trajera algo en sus listas', async () => {
    const lists = { upcomingSessions: [liveSession('ses-x', inDays(2), 'De un curso cerrado')], pendingAssessments: [pendingAssessment] }
    renderPage([
      panelOf(
        panelItem({ ...finishedEnrollment, status: 'FINALIZADA' }, lists),
        panelItem({ ...finishedEnrollment, id: 'certificada', certificateCode: 'K7Q2-M9XW-4RTB' }, lists)
      )
    ])

    await screen.findAllByRole('heading', { level: 3, name: finishedEnrollment.course.title })
    expect(screen.queryByRole('region', { name: 'Próximas sesiones' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Evaluaciones pendientes' })).not.toBeInTheDocument()
    expect(screen.queryByText('De un curso cerrado')).not.toBeInTheDocument()
  })

  it('una sola lectura: ni la lista de matrículas aparte ni una petición por matrícula', async () => {
    renderPage([panelOf(enrollment, otherEnrollment, finishedEnrollment)])

    await screen.findByRole('region', { name: 'Próximas sesiones' })
    expect(called(PANEL)).toBe(1)
    expect(called(ENROLLMENTS)).toBe(0)
    expect(fetchMock.calls.filter((call) => PER_ENROLLMENT.test(call.path))).toEqual([])
  })

  // antes: «con más matrículas que el tope, solo lee hasta el tope y lo dice»
  it('con más matrículas que una página las lee todas, recorriendo páginas, y lo de la última también se ve', async () => {
    const many = Array.from({ length: PANEL_PAGE_SIZE + 3 }, (_, index) =>
      panelItem(
        { ...enrollment, id: `mat-${index}` },
        index === PANEL_PAGE_SIZE + 2 ? { upcomingSessions: [liveSession('ses-final', inDays(2), 'De la última página')] } : {}
      )
    )
    renderPage([
      { path: pageOf(0), body: many.slice(0, PANEL_PAGE_SIZE) },
      { path: pageOf(1), body: many.slice(PANEL_PAGE_SIZE) }
    ])

    const figures = within(await screen.findByRole('complementary', { name: 'Tu resumen' }))
    expect(figures.getByText('En curso').nextElementSibling).toHaveTextContent(String(many.length))
    expect(screen.getAllByRole('article')).toHaveLength(many.length)
    expect(within(screen.getByRole('region', { name: 'Próximas sesiones' })).getByRole('link', { name: /De la última página/ })).toBeInTheDocument()
    expect(fetchMock.calls.map((call) => call.path).filter((path) => path.startsWith('/lms/'))).toEqual([
      `${PANEL}?page=0&size=${PANEL_PAGE_SIZE}`,
      `${PANEL}?page=1&size=${PANEL_PAGE_SIZE}`
    ])
    expect(screen.queryByText(/primer/)).not.toBeInTheDocument()
  })

  it('si falla el panel, los cursos siguen, sus dos bloques lo dicen y «Reintentar» lo recupera', async () => {
    renderPage([panelDown(), { path: ENROLLMENTS, body: [enrollment, otherEnrollment] }])

    const block = within(await screen.findByRole('region', { name: 'Próximas sesiones' }))
    const alert = await block.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar tus próximas sesiones')
    expect(block.queryByText('Nada programado')).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Evaluaciones pendientes' })).getByRole('alert')).toHaveTextContent('No pudimos cargar tus evaluaciones')
    // el resto del panel sigue
    expect(screen.getByRole('region', { name: 'Continuar aprendiendo' })).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(2)

    fetchMock.restore()
    fetchMock = mockFetch([panelOf(panelItem(enrollment, { upcomingSessions: [liveSession('ses-vuelta', inDays(2), 'Sesión recuperada')] }), otherEnrollment)])
    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar las sesiones' }))

    expect(await block.findByRole('link', { name: /Sesión recuperada/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetchMock.calls.map((call) => call.path.split('?')[0])).toEqual([PANEL])
  })

  it('si falla una página posterior no da por completo lo leído: ni filas del riel ni cifras a medias', async () => {
    const first = Array.from({ length: PANEL_PAGE_SIZE }, (_, index) =>
      panelItem({ ...enrollment, id: `mat-${index}` }, { upcomingSessions: [liveSession(`ses-${index}`, inDays(2), 'De la primera página')] })
    )
    const all = [...first.map(({ upcomingSessions: _sessions, pendingAssessments: _assessments, ...rest }) => rest), { ...otherEnrollment, id: 'mat-ultima' }]
    renderPage([
      { path: pageOf(0), body: first },
      { path: pageOf(1), status: 500, body: problem(500, 'caído') },
      { path: ENROLLMENTS, body: all }
    ])

    const block = within(await screen.findByRole('region', { name: 'Próximas sesiones' }))
    expect(await block.findByRole('alert')).toHaveTextContent('No pudimos cargar tus próximas sesiones')
    expect(block.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByText(/próximos 7 días/)).not.toBeInTheDocument()
    // las cifras y los cursos salen de la lista completa
    expect(within(screen.getByRole('complementary', { name: 'Tu resumen' })).getByText('En curso').nextElementSibling).toHaveTextContent(String(all.length))
    expect(screen.getAllByRole('article')).toHaveLength(all.length)
  })

  it('volver a pulsar el menú vuelve a pedir el panel, no la lista', async () => {
    fetchMock = mockFetch([panelOf(enrollment)])
    renderWithProviders(
      <>
        <Link to="/mis-cursos">Menú</Link>
        <MyCoursesPage />
      </>,
      { modules: [classroomModule(), catalogStub], permissions: { admin: false, objects: {} }, route: '/mis-cursos' }
    )
    await waitFor(() => expect(called(PANEL)).toBe(1))

    await userEvent.click(screen.getByRole('link', { name: 'Menú' }))

    await waitFor(() => expect(called(PANEL)).toBe(2))
    expect(called(ENROLLMENTS)).toBe(0)
  })
})
