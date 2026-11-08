import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import type { WasichaiModule } from '@wasichai/core'
import { Link } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { classroomModule } from './module'
import { MyCoursesPage } from './MyCoursesPage'
import { PANEL_PAGE_SIZE } from '../../shared/pages'
import { agendaItem, assessmentSummary, classroom, enrollment, finishedEnrollment, otherEnrollment, panelItem, problem, sessions } from './test/fixtures'

const ENROLLMENTS = '/lms/classroom/enrollments'
const PANEL = '/lms/classroom/panel'
const AGENDA = '/lms/classroom/sessions'
// el aula de la matrícula de «Continuar»: la única que se lee aparte, por los estados de sus lecciones
const PRIMARY_CLASSROOM = `${ENROLLMENTS}/${enrollment.id}`
const PER_ENROLLMENT = /^\/lms\/classroom\/enrollments\/./
const pageOf = (page: number) => new RegExp(`^/lms/classroom/panel\\?page=${page}&size=${PANEL_PAGE_SIZE}$`)
const panelOf = (...items: object[]): MockRoute => ({ path: PANEL, body: items.map((item) => ('upcomingSessions' in item ? item : panelItem(item))) })
const panelDown = (status = 503): MockRoute => ({ path: PANEL, status, body: problem(status, 'caído') })
const agendaOf = (...items: object[]): MockRoute => ({ path: AGENDA, body: items })
const agendaDown = (status = 503): MockRoute => ({ path: AGENDA, status, body: problem(status, 'caído') })
const classroomOf = (body: object = classroom): MockRoute => ({ path: PRIMARY_CLASSROOM, body })
const pendingAssessment = { lessonId: 'lec-eva', assessment: assessmentSummary }
let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

// el catálogo es otro módulo: para el enlace del estado vacío basta registrar una ruta con su clave
const catalogStub: WasichaiModule = { id: 'catalog', routes: [{ id: 'courses', path: 'cursos', chrome: 'public', component: () => null }] }

// la agenda vacía y el aula de SRTM, salvo que la prueba diga otra cosa: las rutas de la prueba van antes y ganan
function renderPage(routes: MockRoute[], modules: WasichaiModule[] = [classroomModule(), catalogStub]) {
  fetchMock = mockFetch([...routes, agendaOf(), classroomOf()])
  return renderWithProviders(<MyCoursesPage />, { modules, route: '/mis-cursos', permissions: { admin: false, objects: {} } })
}

const DAY = 24 * 3600 * 1000
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString().replace(/\.\d+Z$/, 'Z')
// una sesión a la fecha que pida la prueba; las de los ejemplos tienen fecha fija y dejarían de ser futuras
const liveSession = (id: string, start: string, title = 'Sesión', patch: object = {}) => ({
  ...sessions[2],
  id,
  title,
  start,
  end: new Date(Date.parse(start) + 3600 * 1000).toISOString().replace(/\.\d+Z$/, 'Z'),
  lessonId: null,
  originalSessionId: null,
  ...patch
})
const inAgenda = (base: Parameters<typeof agendaItem>[0], ...args: Parameters<typeof liveSession>) => agendaItem(base, liveSession(...args))

const called = (path: string) => fetchMock.calls.filter((call) => call.path.split('?')[0] === path).length
const item = (title: string) => screen.getByRole('heading', { level: 3, name: title }).closest('article')!
const week = () => screen.findByRole('region', { name: 'Esta semana' })

describe('MyCoursesPage', () => {
  it('dice que está cargando mientras llega la respuesta', async () => {
    renderPage([panelOf(otherEnrollment)])

    expect(screen.getByText('Cargando tus cursos…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 3, name: otherEnrollment.course.title })).toBeInTheDocument()
  })

  it('la cabecera es «Mis cursos»; el saludo, con el nombre real, en grande', async () => {
    renderPage([panelOf(enrollment)])

    expect(screen.getByRole('heading', { level: 1, name: 'Mis cursos' })).toBeInTheDocument()
    const greeting = await screen.findByText('Hola, Tester.')
    expect(greeting).toHaveClass('text-h1', 'font-read')
    // sin sesiones en la semana no se inventa ninguna
    expect(screen.queryByText(/próximos 7 días/)).not.toBeInTheDocument()
  })

  it('continue block shows next lesson and segmented progress', async () => {
    renderPage([panelOf(otherEnrollment, enrollment)])

    const hero = within(await screen.findByRole('region', { name: 'Continuar' }))
    // la de avance gana, aunque el servidor ponga antes otra sin empezar
    expect(hero.getByRole('heading', { level: 3, name: enrollment.course.title })).toBeInTheDocument()
    expect(hero.getByText('Unidad 1 · §1.2')).toBeInTheDocument()
    expect(hero.getByText('Recorrido por la pantalla')).toHaveClass('text-h3')
    // un segmento por lección del aula, con su estado; la siguiente, marcada
    const progress = await hero.findByRole('img', { name: '1 de 3 completadas' })
    const segments = [...progress.querySelectorAll('[data-slot="progress-segment"]')]
    expect(segments.map((segment) => segment.getAttribute('data-state'))).toEqual(['COMPLETADA', 'NO_INICIADA', 'NO_INICIADA'])
    expect(segments[1]).toHaveAttribute('data-current')

    const primaries = document.querySelectorAll('[data-slot="button"][data-variant="primary"]')
    expect([...primaries].map((button) => button.getAttribute('aria-label'))).toEqual(['Continuar «Licencias de anuncios con SRTM»'])
    expect(hero.getByRole('link', { name: 'Continuar «Licencias de anuncios con SRTM»' })).toHaveAttribute('href', '/mis-cursos/mat-srtm-1?leccion=lec-video')

    const others = within(screen.getByRole('region', { name: 'Otros cursos en curso' }))
    expect(others.getByRole('link', { name: 'Continuar «Introducción al SGSPE»' })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1?leccion=lec-sgspe-1')
  })

  it('si el aula de «Continuar» no llega, su avance se dice con el resumen de la matrícula', async () => {
    renderPage([panelOf(enrollment), { path: PRIMARY_CLASSROOM, status: 503, body: problem(503, 'caído') }])

    const hero = within(await screen.findByRole('region', { name: 'Continuar' }))
    const bar = await hero.findByRole('progressbar', { name: 'Progreso del curso' })
    expect(bar).toHaveAttribute('aria-valuetext', '1 de 3 lecciones completadas, 33 %')
    expect(hero.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('cada curso de la lista lleva su edición en su zona, su progreso y su acción', async () => {
    renderPage([panelOf(enrollment, otherEnrollment)])

    expect(await screen.findByRole('heading', { level: 3, name: otherEnrollment.course.title })).toBeInTheDocument()
    const card = within(item(otherEnrollment.course.title))
    expect(card.getByRole('link', { name: otherEnrollment.course.title })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1')
    expect(card.getByText(/· En curso$/)).toBeInTheDocument()
    // todas en la misma zona: se dice una vez por página, no en cada fila
    expect(card.queryByText(/Perú/)).not.toBeInTheDocument()
    expect(screen.getAllByText(/^Fechas y horas en hora .*Perú$/)).toHaveLength(1)

    // el resumen de la matrícula no trae el estado de cada lección: una barra continua, no segmentos inventados
    const bar = card.getByRole('progressbar', { name: 'Progreso del curso' })
    expect(bar).toHaveAttribute('aria-valuenow', '0')
    expect(bar).toHaveAttribute('aria-valuetext', '0 de 6 lecciones completadas, 0 %')
    expect(card.getByText('0 de 6')).toBeInTheDocument()
    expect(card.queryByRole('img')).not.toBeInTheDocument()
    expect(card.getByText('Siguiente: Qué es el SGSPE')).toBeInTheDocument()
    // un «Continuar» por curso, cada uno con su nombre accesible
    expect(screen.getAllByRole('link', { name: /^Continuar/ })).toHaveLength(2)
  })

  it('sin siguiente lección ofrece repasar el curso', async () => {
    renderPage([panelOf(finishedEnrollment)])

    const card = within(await screen.findByRole('article', { name: finishedEnrollment.course.title }))
    expect(card.getByText('Has completado todas las lecciones disponibles.')).toBeInTheDocument()
    expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(card.getByRole('link', { name: 'Repasar «Tributos locales»' })).toHaveAttribute('href', '/mis-cursos/mat-done-1')
    expect(card.queryByRole('link', { name: /^Continuar/ })).not.toBeInTheDocument()
  })

  it('completed enrollment shows certificate link', async () => {
    renderPage([panelOf(enrollment, { ...finishedEnrollment, status: 'FINALIZADA', certificateCode: 'K7Q2-M9XW-4RTB' })])

    const completed = within(await screen.findByRole('region', { name: 'Completados' }))
    const card = within(completed.getByRole('article', { name: finishedEnrollment.course.title }))
    expect(card.getByText('Certificado emitido')).toBeInTheDocument()
    expect(card.getByText('K7Q2-M9XW-4RTB')).toBeInTheDocument()
    const link = card.getByRole('link', { name: 'Ver el certificado de «Tributos locales»' })
    expect(link).toHaveAttribute('href', '/certificados/K7Q2-M9XW-4RTB')
    expect(link).toHaveTextContent('Ver el certificado')
    // completado: ni barra ni acción de seguir
    expect(card.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(card.queryByRole('link', { name: /^(Continuar|Repasar)/ })).not.toBeInTheDocument()
  })

  it('withdrawn enrollment is not in progress list', async () => {
    const withdrawn = { ...otherEnrollment, id: 'mat-ret', status: 'RETIRADA', course: { ...otherEnrollment.course, title: 'Curso dejado' } }
    const certified = { ...finishedEnrollment, status: 'FINALIZADA', certificateCode: 'K7Q2-M9XW-4RTB' }
    renderPage([panelOf(enrollment, otherEnrollment, certified, withdrawn)])

    const inProgress = within(await screen.findByRole('region', { name: 'Otros cursos en curso' }))
    expect(inProgress.getByRole('heading', { name: otherEnrollment.course.title })).toBeInTheDocument()
    expect(inProgress.queryByRole('heading', { name: 'Curso dejado' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Continuar' })).queryByText('Curso dejado')).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Completados' })).queryByText('Curso dejado')).not.toBeInTheDocument()

    // RETIRADA: el aula responde 404, así que se ve aparte y sin enlace
    const gone = within(screen.getByRole('region', { name: 'Retirados' }))
    expect(gone.getByRole('heading', { name: 'Curso dejado' })).toBeInTheDocument()
    expect(gone.getByText('Retirada').closest('[data-slot="badge"]')).toBeInTheDocument()
    expect(gone.queryByRole('link')).not.toBeInTheDocument()
    // las cifras «En curso / Completados» ya no van como bloque destacado
    expect(screen.queryByRole('term')).not.toBeInTheDocument()
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

  it('un 403 dice que la cuenta no tiene acceso, no que «el servidor rechazó la consulta»', async () => {
    renderPage([panelDown(403), { path: ENROLLMENTS, status: 403, body: problem(403, 'Forbidden') }])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Tu cuenta no tiene acceso a esto')
    expect(alert).not.toHaveTextContent('rechazó')
  })

  it('un error del servidor se explica y «Reintentar» lo recupera', async () => {
    renderPage([panelDown(), { path: ENROLLMENTS, status: 503, body: problem(503, 'caído') }])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar tus cursos')
    // qué pasó y qué hacer, en llano; el código, aparte y plegado, para quien tenga que reportarlo
    expect(within(alert).getByText(/^El servidor no pudo responder/)).not.toHaveTextContent('503')
    expect(within(alert).getByText('Detalles').closest('details')).toHaveTextContent('Código del error: 503')

    fetchMock.restore()
    fetchMock = mockFetch([panelOf(otherEnrollment), agendaOf()])
    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { level: 3, name: otherEnrollment.course.title })).toBeInTheDocument()
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
  it('con la lista abierta, volver a pulsar su entrada del menú vuelve a pedir el panel y la agenda, no la lista', async () => {
    const routes: MockRoute[] = [panelOf(otherEnrollment), agendaOf()]
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
    await waitFor(() => expect(called(AGENDA)).toBe(1))

    routes[0] = panelOf(otherEnrollment, finishedEnrollment)
    await userEvent.click(screen.getByRole('link', { name: 'Menú' }))

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2))
    expect(called(PANEL)).toBe(2)
    expect(called(AGENDA)).toBe(2)
    expect(called(ENROLLMENTS)).toBe(0)
  })

  // una pestaña que sigue abierta pasada la medianoche: la semana es la del día nuevo, no la del día en que se montó
  it('el intervalo de la agenda sigue al día local: tras medianoche pide la semana nueva', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(new Date(2026, 10, 13, 23, 50))
      const routes: MockRoute[] = [panelOf(otherEnrollment), agendaOf()]
      fetchMock = mockFetch(routes)
      renderWithProviders(
        <>
          <Link to="/mis-cursos">Menú</Link>
          <MyCoursesPage />
        </>,
        { modules: [classroomModule(), catalogStub], permissions: { admin: false, objects: {} }, route: '/mis-cursos' }
      )
      await waitFor(() => expect(called(AGENDA)).toBe(1))
      const froms = () => fetchMock.calls.filter((call) => call.path.startsWith(AGENDA)).map((call) => new URL(call.url, 'http://x').searchParams.get('from'))

      vi.setSystemTime(new Date(2026, 10, 14, 0, 10))
      await userEvent.click(screen.getByRole('link', { name: 'Menú' }))

      await waitFor(() => expect(new Set(froms()).size).toBe(2))
      const [before, after] = [...new Set(froms())].map((from) => Date.parse(from!))
      expect(after! - before!).toBe(24 * 3600 * 1000)
    } finally {
      vi.useRealTimers()
    }
  })

  it('el saludo dice cuántas sesiones en vivo hay en los próximos 7 días, sin las canceladas, y cuántas evaluaciones por hacer', async () => {
    renderPage([
      panelOf(panelItem(enrollment, { pendingAssessments: [pendingAssessment] })),
      agendaOf(
        inAgenda(enrollment, 'ses-pronto', inDays(2)),
        inAgenda(enrollment, 'ses-luego', inDays(3)),
        inAgenda(enrollment, 'ses-cancelada', inDays(4), 'Cancelada', { status: 'CANCELADA' }),
        inAgenda(enrollment, 'ses-lejos', inDays(8))
      )
    ])

    expect(await screen.findByText('Tienes 2 sesiones en vivo en los próximos 7 días. Tienes 1 evaluación por hacer.')).toBeInTheDocument()
  })

  it('si no se pudo leer la agenda, el saludo no cuenta sesiones', async () => {
    renderPage([panelOf(enrollment), agendaDown()])

    expect(await within(await week()).findByRole('alert')).toHaveTextContent('No pudimos cargar tus próximas sesiones.')
    expect(screen.getByText('Hola, Tester.')).toBeInTheDocument()
    expect(screen.queryByText(/próximos 7 días/)).not.toBeInTheDocument()
  })

  it('sin nada que continuar, no hay bloque ni primaria', async () => {
    renderPage([panelOf(finishedEnrollment)])

    await screen.findByRole('heading', { level: 3, name: finishedEnrollment.course.title })
    expect(screen.queryByRole('region', { name: 'Continuar' })).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="button"][data-variant="primary"]')).toHaveLength(0)
  })

  it('un curso sin lecciones disponibles no se da por completado', async () => {
    renderPage([panelOf({ ...enrollment, progress: { completedLessons: 0, totalLessons: 0, percent: 0 }, nextLesson: null })])

    await screen.findByRole('heading', { level: 3, name: enrollment.course.title })
    expect(screen.queryByRole('region', { name: 'Completados' })).not.toBeInTheDocument()
    expect(screen.getByText('Este curso todavía no tiene lecciones disponibles.')).toBeInTheDocument()
    expect(screen.queryByText('Has completado todas las lecciones disponibles.')).not.toBeInTheDocument()
  })

  it('week rail lists sessions of next 7 days from agenda endpoint', async () => {
    const soon = inDays(1)
    renderPage([
      panelOf(enrollment, otherEnrollment),
      agendaOf(
        inAgenda(otherEnrollment, 'ses-pronto', soon, 'Pronto'),
        inAgenda(enrollment, 'ses-luego', inDays(5), 'Luego', { status: 'REPROGRAMADA' }),
        inAgenda(enrollment, 'ses-cancelada', inDays(6), 'Se cae', { status: 'CANCELADA' }),
        inAgenda(enrollment, 'ses-pasada', inDays(-2), 'Ya terminó'),
        inAgenda(enrollment, 'ses-lejos', inDays(7.5), 'Fuera de la semana')
      )
    ])

    const block = within(await week())
    const rows = await block.findAllByRole('link')
    // de la más próxima a la más lejana, de todos los cursos; ni la que terminó ni la de después de 7 días
    expect(rows.map((row) => row.querySelector('[data-slot="session-title"]')?.textContent)).toEqual(['Pronto', 'Luego', 'Se cae'])
    expect(rows[0]).toHaveAttribute('href', `/mis-cursos/${otherEnrollment.id}/sesiones`)
    expect(within(rows[0]!).getByText(otherEnrollment.course.title)).toBeInTheDocument()
    // la hora en la zona de su edición, en un <time>
    const start = Date.parse(soon)
    const hour = new Intl.DateTimeFormat('es', { timeStyle: 'short', timeZone: 'America/Lima' }).format(start)
    expect(
      within(rows[0]!)
        .getByText(new RegExp(`^${hour}`))
        .closest('time')
    ).toHaveAttribute('datetime', soon)
    // el estado se dice con palabras: reprogramada y cancelada vienen de la agenda
    expect(within(rows[1]!).getByText(/Reprogramada/)).toBeInTheDocument()
    expect(within(rows[2]!).getByText(/Cancelada/)).toBeInTheDocument()
    // agrupadas por día: cada día con su nombre y su número
    const weekday = new Intl.DateTimeFormat('es', { weekday: 'short', timeZone: 'America/Lima' }).format(start).replace('.', '')
    expect(block.getAllByText(new RegExp(`^${weekday}$`, 'i')).length).toBeGreaterThan(0)

    // una sola petición para la semana, sin las sesiones de cada matrícula
    expect(called(AGENDA)).toBe(1)
    const [from, to] = ['from', 'to'].map((name) =>
      new URL(fetchMock.calls.find((call) => call.path.startsWith(AGENDA))!.url, 'http://x').searchParams.get(name)!
    )
    expect(Date.parse(from!)).toBeLessThanOrEqual(Date.now())
    expect(Date.parse(to!)).toBeGreaterThanOrEqual(Date.now() + 7 * DAY)
    expect(Date.parse(to!) - Date.parse(from!)).toBeLessThanOrEqual(62 * DAY)
    expect(fetchMock.calls.filter((call) => /\/sessions$/.test(call.path.split('?')[0]!) && call.path.startsWith(ENROLLMENTS))).toEqual([])
  })

  it('la agenda trae también las sesiones de una matrícula finalizada o con certificado: el riel no las pinta', async () => {
    const certified = { ...finishedEnrollment, id: 'certificada', certificateCode: 'K7Q2-M9XW-4RTB' }
    const closed = { ...finishedEnrollment, status: 'FINALIZADA' }
    renderPage([
      panelOf(otherEnrollment, closed, certified),
      agendaOf(inAgenda(closed, 'ses-x', inDays(2), 'De un curso cerrado'), inAgenda(certified, 'ses-y', inDays(2), 'De un curso certificado'))
    ])

    expect(await within(await week()).findByText('Nada programado en los próximos 7 días')).toBeInTheDocument()
    expect(screen.queryByText('De un curso cerrado')).not.toBeInTheDocument()
    expect(screen.queryByText('De un curso certificado')).not.toBeInTheDocument()
  })

  it('la zona de la página no se repite en la semana; con otra zona, la semana dice la suya', async () => {
    renderPage([panelOf(enrollment), agendaOf(inAgenda(enrollment, 'ses-1', inDays(2)))])

    const block = within(await week())
    await block.findByRole('link')
    expect(block.queryByText(/^Horas en/)).not.toBeInTheDocument()

    // ediciones en dos zonas: la página no dice ninguna, y la semana, con sesiones solo de Madrid, dice esa
    fetchMock.restore()
    const madrid = { ...otherEnrollment, offering: { ...otherEnrollment.offering, timeZone: 'Europe/Madrid' } }
    renderPage([panelOf(enrollment, madrid), agendaOf(inAgenda(madrid, 'ses-2', inDays(2), 'En Madrid', { timeZone: 'Europe/Madrid' }))])
    expect(await screen.findByText(/^Horas en hora .*Europa central$/)).toBeInTheDocument()
  })

  it('con ediciones en zonas distintas, cada fila dice la suya y no hay nota de página', async () => {
    const madrid = { ...otherEnrollment, offering: { ...otherEnrollment.offering, timeZone: 'Europe/Madrid' } }
    renderPage([panelOf(enrollment, madrid)])

    await screen.findByRole('heading', { level: 3, name: madrid.course.title })
    expect(within(item(madrid.course.title)).getByText(/^Fechas en hora .*Europa central$/)).toBeInTheDocument()
    expect(screen.queryByText(/^Fechas y horas en/)).not.toBeInTheDocument()
  })

  it('sin sesiones ni evaluaciones, cada bloque lo dice en una línea', async () => {
    renderPage([panelOf(enrollment)])

    expect(await within(await week()).findByText('Nada programado en los próximos 7 días')).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Por hacer' })).findByText('Nada pendiente')).toBeInTheDocument()
  })

  it('«Por hacer» muestra las evaluaciones pendientes con lo que queda, sin plazos', async () => {
    renderPage([panelOf(panelItem(otherEnrollment, { pendingAssessments: [pendingAssessment] }))])

    const block = within(await screen.findByRole('region', { name: 'Por hacer' }))
    const row = await block.findByRole('link', { name: new RegExp(assessmentSummary.title) })
    expect(row).toHaveAttribute('href', `/mis-cursos/${otherEnrollment.id}?leccion=lec-eva`)
    expect(within(row).getByText('Quedan 2 intentos')).toBeInTheDocument()
  })

  it.each([
    ['abierta', { openAttemptId: 'int-1' }, 'Intento abierto'],
    ['en corrección', { best: { percent: null, passed: null, pending: true } }, 'En corrección']
  ])('una evaluación %s lo dice', async (_case, overrides, text) => {
    renderPage([panelOf(panelItem(enrollment, { pendingAssessments: [{ lessonId: 'lec-eva', assessment: { ...assessmentSummary, ...overrides } }] }))])

    const block = within(await screen.findByRole('region', { name: 'Por hacer' }))
    expect(await block.findByText(text)).toBeInTheDocument()
  })

  it('sin matrículas activas no hay columna lateral', async () => {
    const lists = { pendingAssessments: [pendingAssessment] }
    renderPage([
      panelOf(
        panelItem({ ...finishedEnrollment, status: 'FINALIZADA' }, lists),
        panelItem({ ...finishedEnrollment, id: 'certificada', certificateCode: 'K7Q2-M9XW-4RTB' }, lists)
      )
    ])

    await screen.findAllByRole('heading', { level: 3, name: finishedEnrollment.course.title })
    expect(screen.queryByRole('region', { name: 'Esta semana' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Por hacer' })).not.toBeInTheDocument()
  })

  it('lecturas: el panel, la agenda y el aula de «Continuar»; ni la lista de matrículas ni nada más por matrícula', async () => {
    renderPage([panelOf(enrollment, otherEnrollment, finishedEnrollment)])

    await within(await screen.findByRole('region', { name: 'Continuar' })).findByRole('img')
    expect(called(PANEL)).toBe(1)
    expect(called(AGENDA)).toBe(1)
    expect(called(ENROLLMENTS)).toBe(0)
    expect(fetchMock.calls.filter((call) => PER_ENROLLMENT.test(call.path)).map((call) => call.path)).toEqual([PRIMARY_CLASSROOM])
  })

  // antes: «con más matrículas que el tope, solo lee hasta el tope y lo dice»
  it('con más matrículas que una página las lee todas, recorriendo páginas, y lo de la última también se ve', async () => {
    const many = Array.from({ length: PANEL_PAGE_SIZE + 3 }, (_, index) =>
      panelItem(
        { ...otherEnrollment, id: `mat-${index}` },
        index === PANEL_PAGE_SIZE + 2
          ? { pendingAssessments: [{ ...pendingAssessment, assessment: { ...assessmentSummary, title: 'De la última página' } }] }
          : {}
      )
    )
    renderPage([
      { path: pageOf(0), body: many.slice(0, PANEL_PAGE_SIZE) },
      { path: pageOf(1), body: many.slice(PANEL_PAGE_SIZE) },
      { path: `${ENROLLMENTS}/mat-0`, body: { ...classroom, ...otherEnrollment, id: 'mat-0' } }
    ])

    expect(await within(await screen.findByRole('region', { name: 'Por hacer' })).findByText('De la última página')).toBeInTheDocument()
    // la primera es «Continuar»; el resto, la lista
    expect(screen.getAllByRole('article')).toHaveLength(many.length)
    expect(fetchMock.calls.map((call) => call.path).filter((path) => path.startsWith(PANEL))).toEqual([
      `${PANEL}?page=0&size=${PANEL_PAGE_SIZE}`,
      `${PANEL}?page=1&size=${PANEL_PAGE_SIZE}`
    ])
    expect(screen.queryByText(/primer/)).not.toBeInTheDocument()
  })

  it('si falla el panel, los cursos siguen, «Por hacer» lo dice y «Reintentar» lo recupera; la semana no depende de él', async () => {
    renderPage([
      panelDown(),
      { path: ENROLLMENTS, body: [enrollment, otherEnrollment] },
      agendaOf(inAgenda(enrollment, 'ses-1', inDays(2), 'Sigue a la vista'))
    ])

    const block = within(await screen.findByRole('region', { name: 'Por hacer' }))
    const alert = await block.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar tus evaluaciones')
    expect(block.queryByText('Nada pendiente')).not.toBeInTheDocument()
    expect(await within(await week()).findByText('Sigue a la vista')).toBeInTheDocument()
    // el resto del panel sigue
    expect(screen.getByRole('region', { name: 'Continuar' })).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(2)

    fetchMock.restore()
    fetchMock = mockFetch([panelOf(panelItem(enrollment, { pendingAssessments: [pendingAssessment] }), otherEnrollment)])
    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar las evaluaciones' }))

    expect(await block.findByRole('link', { name: new RegExp(assessmentSummary.title) })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetchMock.calls.map((call) => call.path.split('?')[0])).toEqual([PANEL])
  })

  it('si falla la agenda, la semana lo dice y «Reintentar las sesiones» la vuelve a pedir, sola', async () => {
    renderPage([panelOf(enrollment), agendaDown()])

    const block = within(await week())
    const alert = await block.findByRole('alert')
    expect(block.queryByText('Nada programado en los próximos 7 días')).not.toBeInTheDocument()

    fetchMock.restore()
    fetchMock = mockFetch([agendaOf(inAgenda(enrollment, 'ses-vuelta', inDays(2), 'Sesión recuperada'))])
    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar las sesiones' }))

    expect(await block.findByRole('link', { name: /Sesión recuperada/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetchMock.calls.map((call) => call.path.split('?')[0])).toEqual([AGENDA])
  })

  it('si falla una página posterior no da por completo lo leído: ni filas de «Por hacer» ni datos a medias', async () => {
    const first = Array.from({ length: PANEL_PAGE_SIZE }, (_, index) =>
      panelItem(
        { ...otherEnrollment, id: `mat-${index}` },
        { pendingAssessments: [{ ...pendingAssessment, assessment: { ...assessmentSummary, title: 'De la primera página' } }] }
      )
    )
    const all = [
      ...first.map(({ upcomingSessions: _sessions, pendingAssessments: _assessments, ...rest }) => rest),
      { ...finishedEnrollment, id: 'mat-ultima' }
    ]
    renderPage([
      { path: pageOf(0), body: first },
      { path: pageOf(1), status: 500, body: problem(500, 'caído') },
      { path: ENROLLMENTS, body: all }
    ])

    const block = within(await screen.findByRole('region', { name: 'Por hacer' }))
    expect(await block.findByRole('alert')).toHaveTextContent('No pudimos cargar tus evaluaciones')
    expect(block.queryByRole('link')).not.toBeInTheDocument()
    // los cursos salen de la lista completa
    expect(screen.getAllByRole('article')).toHaveLength(all.length)
  })
})
