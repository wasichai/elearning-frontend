import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isoInstant } from './agenda'
import { classroomModule } from './module'
import { SchedulePage } from './SchedulePage'
import { agendaItem, assessmentSummary, enrollment, otherEnrollment, panelItem, problem, sessions } from './test/fixtures'

// el horario del estudiante: la semana de la URL (o la actual), con las sesiones de todas sus matrículas en el día y la hora de su edición

const AGENDA = '/lms/classroom/sessions'
const PANEL = '/lms/classroom/panel'
// el lunes 9 de noviembre de 2026 a mediodía en Lima; solo se fija Date: los temporizadores siguen
const NOW = new Date('2026-11-09T17:00:00Z')

let fetchMock: FetchMock
beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: NOW }))
afterEach(() => {
  fetchMock?.restore()
  vi.useRealTimers()
  localStorage.clear()
})

const session = (id: string, start: string, end: string, patch: object = {}) => ({
  ...sessions[2],
  id,
  title: `Sesión ${id}`,
  start,
  end,
  lessonId: null,
  originalSessionId: null,
  link: 'https://meet.example/' + id,
  ...patch
})
const agendaOf = (...items: object[]): MockRoute => ({ path: AGENDA, body: items })
const panelOf = (...items: object[]): MockRoute => ({ path: PANEL, body: items })

// la búsqueda de la URL a la vista, para ver cómo queda ?semana=
function Search() {
  return <output aria-label="búsqueda">{useLocation().search}</output>
}

function renderSchedule(routes: MockRoute[], route = '/horario') {
  fetchMock = mockFetch([...routes, panelOf(), agendaOf()])
  return renderWithProviders(
    <>
      <SchedulePage />
      <Search />
    </>,
    { modules: [classroomModule()], route, path: '/horario' }
  )
}
const search = () => screen.getByRole('status', { name: 'búsqueda' })

const agendaCalls = () => fetchMock.calls.filter((call) => call.path.split('?')[0] === AGENDA).map((call) => new URL(call.url, 'http://x').searchParams)
// la medianoche local de una fecha civil, como la pide la pantalla
const localMidnight = (year: number, month: number, day: number) => isoInstant(new Date(year, month - 1, day))
const chooseList = () => userEvent.click(screen.getByRole('button', { name: 'Lista' }))

describe('SchedulePage', () => {
  it('requests the visible week range', async () => {
    // un miércoles en la URL: la semana es la de su lunes, con un día de margen a cada lado (lo que sobra se quita en la pantalla)
    renderSchedule([], '/horario?semana=2026-11-18')

    expect(await screen.findByRole('heading', { level: 1, name: 'Semana del 16 al 22 de noviembre' })).toBeInTheDocument()
    await waitFor(() => expect(agendaCalls()).toHaveLength(1))
    expect(agendaCalls()[0]?.get('from')).toBe(localMidnight(2026, 11, 15))
    expect(agendaCalls()[0]?.get('to')).toBe(localMidnight(2026, 11, 24))

    // la siguiente y la anterior son enlaces con la semana en la URL; «Hoy» vuelve a la de hoy, sin ella
    const weeks = within(screen.getByRole('navigation', { name: 'Semanas' }))
    expect(weeks.getByRole('link', { name: 'Semana anterior' })).toHaveAttribute('href', '/horario?semana=2026-11-09')
    expect(weeks.getByRole('link', { name: 'Hoy' })).toHaveAttribute('href', '/horario')
    await userEvent.click(weeks.getByRole('link', { name: 'Semana siguiente' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Semana del 23 al 29 de noviembre' })).toBeInTheDocument()
    await waitFor(() => expect(agendaCalls()).toHaveLength(2))
    expect(agendaCalls()[1]?.get('from')).toBe(localMidnight(2026, 11, 22))
    expect(agendaCalls()[1]?.get('to')).toBe(localMidnight(2026, 12, 1))
  })

  it('sin semana en la URL, o con una fecha que no existe, muestra la de hoy', async () => {
    renderSchedule([], '/horario?semana=2026-02-30')

    expect(await screen.findByRole('heading', { level: 1, name: 'Semana del 9 al 15 de noviembre' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Semanas' })).getByRole('link', { name: 'Hoy' })).toHaveAttribute('aria-current', 'date')
  })

  it('la URL dice siempre un lunes: otro día se cambia por su lunes', async () => {
    renderSchedule([], '/horario?semana=2026-11-18')

    await screen.findByRole('heading', { level: 1, name: 'Semana del 16 al 22 de noviembre' })
    await waitFor(() => expect(search()).toHaveTextContent('?semana=2026-11-16'))
  })

  for (const value of ['2026-02-30', '9999-12-27', '0001-01-01', 'mañana'])
    it(`un ?semana= que no vale (${value}) no rompe la pantalla: muestra la de hoy y se quita de la URL`, async () => {
      renderSchedule([], `/horario?semana=${value}`)

      expect(await screen.findByRole('heading', { level: 1, name: 'Semana del 9 al 15 de noviembre' })).toBeInTheDocument()
      await waitFor(() => expect(search()).toBeEmptyDOMElement())
    })

  it('groups sessions by day in the offering time zone', async () => {
    renderSchedule(
      [
        agendaOf(
          // el martes 17 a las 22:00 en Lima ya es miércoles en UTC: va el martes, a su hora
          agendaItem(enrollment, session('lima', '2026-11-18T03:00:00Z', '2026-11-18T04:00:00Z')),
          // el lunes 23 a las 07:00 en Tokio aún es domingo 22 en UTC: la trae el margen, pero no es de esta semana
          agendaItem(otherEnrollment, session('tokio', '2026-11-22T22:00:00Z', '2026-11-22T23:00:00Z', { timeZone: 'Asia/Tokyo' })),
          // el domingo 22 a las 08:00 en Lima
          agendaItem(otherEnrollment, session('domingo', '2026-11-22T13:00:00Z', '2026-11-22T14:00:00Z'))
        )
      ],
      '/horario?semana=2026-11-16'
    )
    await screen.findByRole('heading', { level: 1, name: 'Semana del 16 al 22 de noviembre' })
    await chooseList()

    const day = (name: RegExp) => within(screen.getByRole('heading', { name }).closest('li')!)
    const tuesday = day(/martes, 17 de noviembre/)
    expect(tuesday.getByRole('article', { name: 'Sesión lima' })).toBeInTheDocument()
    expect(tuesday.getByText(/^22:00.23:00$/)).toBeInTheDocument()
    expect(tuesday.getByText(enrollment.course.title)).toBeInTheDocument()
    expect(day(/miércoles, 18 de noviembre/).getByText('Sin sesiones')).toBeInTheDocument()
    expect(day(/domingo, 22 de noviembre/).getByRole('article', { name: 'Sesión domingo' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Sesión tokio' })).not.toBeInTheDocument()
    // todas en la misma zona: se dice una vez
    expect(screen.getByText(/^Horas en hora (estándar )?de Perú$/)).toBeInTheDocument()
  })

  it('cancelled session is struck through with badge', async () => {
    renderSchedule(
      [
        agendaOf(
          agendaItem(enrollment, session('cancelada', '2026-11-10T13:00:00Z', '2026-11-10T14:00:00Z', { title: 'Consulta cancelada', status: 'CANCELADA' })),
          agendaItem(enrollment, session('movida', '2026-11-11T13:00:00Z', '2026-11-11T14:00:00Z', { title: 'Consulta movida', status: 'REPROGRAMADA' })),
          agendaItem(enrollment, session('normal', '2026-11-12T13:00:00Z', '2026-11-12T14:00:00Z', { title: 'Consulta normal' }))
        )
      ],
      '/horario'
    )

    // en la vista de semana, el detalle bajo la rejilla: cada estado con su insignia y su palabra
    const details = within(await screen.findByRole('region', { name: 'Sesiones de la semana' }))
    const cancelled = within(details.getByRole('article', { name: 'Consulta cancelada' }))
    expect(cancelled.getByText('Consulta cancelada')).toHaveClass('line-through')
    expect(cancelled.getByText('Cancelada').closest('[data-state]')).toHaveAttribute('data-state', 'overdue')
    // a una cancelada no se entra
    expect(cancelled.queryByRole('link', { name: /Entrar a la sesión/ })).not.toBeInTheDocument()
    expect(within(details.getByRole('article', { name: 'Consulta movida' })).getByText('Reprogramada')).toBeInTheDocument()
    const normal = within(details.getByRole('article', { name: 'Consulta normal' }))
    expect(normal.getByText('Programada')).toBeInTheDocument()
    expect(normal.getByRole('link', { name: 'Entrar a la sesión «Consulta normal» (se abre en otra pestaña)' })).toHaveAttribute(
      'href',
      'https://meet.example/normal'
    )
    // la rejilla dice la hora, el título, el curso y el estado en el nombre de cada bloque, y enlaza a su detalle
    const block = screen.getByRole('link', { name: new RegExp(`, Consulta cancelada, ${enrollment.course.title}, Cancelada$`) })
    expect(block).toHaveClass('line-through')
    expect(block).toHaveAttribute('href', `#sesion-${enrollment.id}-cancelada`)
    expect(document.getElementById(`sesion-${enrollment.id}-cancelada`)).toHaveAccessibleName('Consulta cancelada')
  })

  it('una sesión que cruza la medianoche continúa en el día siguiente de la rejilla, marcada como continuación', async () => {
    renderSchedule(
      [agendaOf(agendaItem(enrollment, session('noche', '2026-11-11T03:00:00Z', '2026-11-11T06:30:00Z', { title: 'Guardia nocturna' })))],
      '/horario?semana=2026-11-09'
    )

    const tuesday = within(await screen.findByRole('list', { name: /martes, 10 de noviembre/ }))
    const wednesday = within(screen.getByRole('list', { name: /miércoles, 11 de noviembre/ }))
    expect(tuesday.getByRole('link', { name: /, Guardia nocturna, / })).not.toHaveAccessibleName(/continuación/)
    const continuation = wednesday.getByRole('link', { name: /Guardia nocturna \(continuación del día anterior\)/ })
    expect(continuation).toHaveAttribute('href', `#sesion-${enrollment.id}-noche`)
    expect(continuation).toHaveTextContent(/sigue hasta 0?1:30/)
    // una sola entrada en el detalle: la continuación no cuenta otra vez
    expect(within(screen.getByRole('region', { name: 'Sesiones de la semana' })).getAllByRole('article')).toHaveLength(1)
  })

  it('con ediciones en varias zonas, el eje rotula su zona y los bloques de otra indican la suya', async () => {
    renderSchedule(
      [
        agendaOf(
          agendaItem(enrollment, session('lima1', '2026-11-10T13:00:00Z', '2026-11-10T14:00:00Z', { title: 'En Lima uno' })),
          agendaItem(enrollment, session('lima2', '2026-11-11T13:00:00Z', '2026-11-11T14:00:00Z', { title: 'En Lima dos' })),
          agendaItem(otherEnrollment, session('tokio', '2026-11-12T01:00:00Z', '2026-11-12T02:00:00Z', { title: 'En Tokio', timeZone: 'Asia/Tokyo' }))
        )
      ],
      '/horario?semana=2026-11-09'
    )

    const lima = await screen.findByRole('link', { name: /, En Lima uno, / })
    expect(lima.getAttribute('aria-label')).not.toMatch(/GMT|UTC/)
    // la zona del eje es la más frecuente (Lima, GMT-5)
    expect(screen.getByTitle(/Perú/)).toHaveTextContent('GMT-5')
    expect(screen.getByRole('link', { name: /, En Tokio, / }).getAttribute('aria-label')).toMatch(/GMT\+9/)
  })

  it('con una sola zona el eje no lleva rótulo', async () => {
    renderSchedule([agendaOf(agendaItem(enrollment, session('a', '2026-11-10T13:00:00Z', '2026-11-10T14:00:00Z')))], '/horario?semana=2026-11-09')

    await screen.findByRole('link', { name: /, Sesión a, / })
    expect(screen.queryByTitle(/Perú/)).not.toBeInTheDocument()
  })

  it('empty week shows EmptyState', async () => {
    renderSchedule([agendaOf()], '/horario')

    expect((await screen.findByText('No tienes sesiones esta semana')).closest('[data-state="empty"]')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Sesiones de la semana' })).not.toBeInTheDocument()
    // la navegación sigue, para ir a otra semana
    expect(within(screen.getByRole('navigation', { name: 'Semanas' })).getByRole('link', { name: 'Semana siguiente' })).toBeInTheDocument()
  })

  it('si la agenda falla, lo dice y deja reintentar', async () => {
    renderSchedule([{ path: AGENDA, status: 503, body: problem(503, 'caído') }])

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('guarda la vista elegida en este navegador', async () => {
    renderSchedule([agendaOf(agendaItem(enrollment, session('a', '2026-11-10T13:00:00Z', '2026-11-10T14:00:00Z')))])
    await screen.findByRole('region', { name: 'Sesiones de la semana' })

    await chooseList()

    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('region', { name: 'Sesiones de la semana' })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('wasichai-test.schedule') ?? '{}')).toEqual({ view: 'list' })
  })

  it('al lado, «Por hacer» con las evaluaciones que quedan, y dice que no son solo de esta semana', async () => {
    renderSchedule([panelOf(panelItem(enrollment, { pendingAssessments: [{ lessonId: 'lec-eva', assessment: assessmentSummary }] }))])

    const todo = within(await screen.findByRole('region', { name: 'Por hacer' }))
    expect(await todo.findByRole('link', { name: new RegExp(assessmentSummary.title) })).toHaveAttribute('href', `/mis-cursos/${enrollment.id}?leccion=lec-eva`)
    expect(screen.getByText(/no solo las de esta semana/)).toBeInTheDocument()
  })
})
