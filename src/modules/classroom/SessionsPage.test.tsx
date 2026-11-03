import { screen, within } from '@testing-library/react'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ClassroomPage } from './ClassroomPage'
import { classroomModule } from './module'
import { SessionsPage } from './SessionsPage'
import { serveFiles } from '../../test/files'
import { assessmentClassroom, problem, sessions } from './test/fixtures'

// las sesiones en vivo de una matrícula (ADR-0016): horas en la zona de la edición, estado, enlace https y asistencia

const CLASSROOM = '/lms/classroom/enrollments/mat-sgspe-1'
const SESSIONS = `${CLASSROOM}/sessions`

// las sesiones de los ejemplos tienen fecha fija: se mira la agenda antes y después de ellas (solo se fija Date: los temporizadores siguen)
const BEFORE_ALL = new Date('2026-09-01T12:00:00Z')
const MID_COURSE = new Date('2026-10-01T12:00:00Z')
const AFTER_ALL = new Date('2026-12-20T12:00:00Z')
const at = (date: Date) => vi.useFakeTimers({ toFake: ['Date'], now: date })

let fetchMock: FetchMock
beforeEach(() => at(BEFORE_ALL))
afterEach(() => {
  fetchMock?.restore()
  vi.useRealTimers()
})

function renderSessions(routes: MockRoute[], language?: string) {
  fetchMock = mockFetch(routes)
  return renderWithProviders(<SessionsPage />, {
    modules: [classroomModule()],
    route: '/mis-cursos/mat-sgspe-1/sesiones',
    path: '/mis-cursos/:enrollmentId/sesiones',
    language
  })
}

const session = (name: string) => screen.findByRole('article', { name })

describe('SessionsPage', () => {
  it('lista las sesiones por inicio, con la fecha y la hora de la edición y su zona dicha una vez', async () => {
    renderSessions([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: SESSIONS, body: [...sessions].reverse() }
    ])

    expect(await screen.findByRole('heading', { level: 1, name: 'Introducción al SGSPE' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Sesiones en vivo' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Secciones del curso' })).getByRole('link', { name: 'Sesiones' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(within(screen.getByRole('navigation', { name: 'Ruta' })).getByRole('link', { name: 'Mis cursos' })).toHaveAttribute('href', '/mis-cursos')
    expect(await screen.findByText(/^Horas en hora (estándar )?de Perú$/)).toBeInTheDocument()
    expect(screen.getAllByRole('article').map((article) => article.getAttribute('aria-label'))).toEqual([
      'Presentación del curso',
      'Consulta de la unidad',
      'Recuperación de la consulta'
    ])
    // 13:00 UTC son las 08:00 en Lima, se mire desde donde se mire
    expect(screen.getByRole('heading', { name: /^martes.*8 de septiembre de 2026$/ })).toBeInTheDocument()
    const first = within(await session('Presentación del curso'))
    expect(first.getByText(/^8:00.9:30$/)).toBeInTheDocument()
    expect(first.getByText('Reprogramada')).toBeInTheDocument()
    expect(first.getByText('Teoría')).toBeInTheDocument()
    expect(first.getByText('Virtual').previousElementSibling).toHaveAttribute('aria-hidden', 'true')
    expect(first.getByText('presente')).toBeInTheDocument()
    const join = first.getByRole('link', { name: 'Entrar a la sesión «Presentación del curso» (se abre en otra pestaña)' })
    expect(join).toHaveAttribute('href', 'https://meet.example/sgspe-1')
    expect(join).toHaveAttribute('target', '_blank')
    expect(join).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('una cancelada se tacha, se dice y no ofrece enlace ni asistencia; la recuperación dice dónde y qué recupera', async () => {
    renderSessions([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: SESSIONS, body: sessions }
    ])

    const cancelled = within(await session('Consulta de la unidad'))
    expect(cancelled.getByText('Cancelada')).toBeInTheDocument()
    expect(cancelled.getByText('Consulta de la unidad')).toHaveClass('line-through')
    expect(cancelled.queryByRole('link', { name: /Entrar/ })).not.toBeInTheDocument()
    expect(cancelled.queryByText(/Tu asistencia/)).not.toBeInTheDocument()
    expect(cancelled.getByRole('link', { name: 'Ver la lección' })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1?leccion=lec-sesion')

    const recovery = within(await session('Recuperación de la consulta'))
    expect(recovery.getByText('Recuperación')).toBeInTheDocument()
    expect(recovery.getByText('Presencial')).toBeInTheDocument()
    expect(recovery.getByText('Aula 204, sede central')).toBeInTheDocument()
    expect(recovery.getByText('Recupera «Consulta de la unidad»')).toBeInTheDocument()
    // lo que aún no ha pasado no tiene asistencia que registrar
    expect(recovery.queryByText(/Tu asistencia/)).not.toBeInTheDocument()
    expect(recovery.queryByText('Programada')).not.toBeInTheDocument()
  })

  it('separa próximas y pasadas: primero lo que viene, y de lo pasado, lo más reciente', async () => {
    at(MID_COURSE)
    renderSessions([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: SESSIONS, body: sessions }
    ])

    const upcoming = within(await screen.findByRole('region', { name: 'Próximas' }))
    const past = within(screen.getByRole('region', { name: 'Pasadas' }))
    expect(upcoming.getAllByRole('article').map((article) => article.getAttribute('aria-label'))).toEqual(['Recuperación de la consulta'])
    expect(past.getAllByRole('article').map((article) => article.getAttribute('aria-label'))).toEqual(['Consulta de la unidad', 'Presentación del curso'])
    // a una sesión que ya terminó no se entra, y dice cómo quedó tu asistencia
    const held = within(past.getByRole('article', { name: 'Presentación del curso' }))
    expect(held.queryByRole('link', { name: /Entrar/ })).not.toBeInTheDocument()
    expect(held.getByText('presente')).toBeInTheDocument()
  })

  it('terminadas todas, «Próximas» lo dice y una pasada sin registro también', async () => {
    at(AFTER_ALL)
    renderSessions([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: SESSIONS, body: sessions }
    ])

    const upcoming = within(await screen.findByRole('region', { name: 'Próximas' }))
    expect(upcoming.getByText('No hay sesiones por delante.')).toBeInTheDocument()
    expect(within(await session('Recuperación de la consulta')).getByText('aún sin registrar')).toBeInTheDocument()
  })

  it('dos sesiones del mismo día van bajo el mismo día', async () => {
    renderSessions([
      { path: CLASSROOM, body: assessmentClassroom },
      {
        path: SESSIONS,
        body: [
          { ...sessions[2], id: 'a', title: 'Mañana', start: '2026-11-17T13:00:00Z', end: '2026-11-17T14:00:00Z', originalSessionId: null },
          // 03:00 UTC del 18 sigue siendo el 17 en Lima
          { ...sessions[2], id: 'b', title: 'Noche', start: '2026-11-18T03:00:00Z', end: '2026-11-18T04:00:00Z', originalSessionId: null }
        ]
      }
    ])

    await session('Noche')
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(/17 de noviembre de 2026/)
  })

  it('la cabecera da el avance con cifras reales, también la asistencia, y lleva a las demás secciones', async () => {
    renderSessions([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: SESSIONS, body: sessions }
    ])

    const figures = within(await screen.findByRole('list', { name: 'Tu avance' }))
    expect(figures.getByText('1 de 3')).toBeInTheDocument()
    expect(figures.getByText('lecciones')).toBeInTheDocument()
    expect(figures.getByText('0 de 1')).toBeInTheDocument()
    expect(await figures.findByText('1 de 2')).toBeInTheDocument()
    const tabs = within(screen.getByRole('navigation', { name: 'Secciones del curso' }))
    expect(tabs.getByRole('link', { name: 'Lecciones' })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1')
    expect(tabs.getByRole('link', { name: 'Finalización' })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1/finalizacion')
  })

  it('sin sesiones lo dice', async () => {
    renderSessions([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: SESSIONS, body: [] }
    ])

    expect(await screen.findByText('Este curso no tiene sesiones en vivo.')).toBeInTheDocument()
    expect(screen.getByText('Si se programa alguna, la verás aquí con su día y su hora.')).toBeInTheDocument()
  })

  it('un enlace que no es https rompe el contrato: no se pinta nada a medias', async () => {
    renderSessions([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: SESSIONS, body: [{ ...sessions[0], link: 'http://meet.example/x' }] }
    ])

    expect(await screen.findByText('No pudimos leer la respuesta del servidor')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Entrar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('un error del servidor se explica', async () => {
    renderSessions([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: SESSIONS, status: 500, body: problem(500, 'fallo') }
    ])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar las sesiones')
    expect(alert).toHaveTextContent('error 500')
  })

  it('una matrícula ajena (404) es «no está en tus matrículas»', async () => {
    renderSessions([{ path: CLASSROOM, status: 404, body: problem(404, 'No existe') }])

    expect(await screen.findByRole('heading', { level: 1, name: 'No encontramos este curso en tus matrículas' })).toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderSessions(
      [
        { path: CLASSROOM, body: assessmentClassroom },
        { path: SESSIONS, body: sessions }
      ],
      'en'
    )

    const first = within(await session('Presentación del curso'))
    expect(screen.getByRole('heading', { name: /^Tuesday.*September 8, 2026$/ })).toBeInTheDocument()
    expect(first.getByText(/8:00.*9:30/)).toBeInTheDocument()
    expect(first.getByText('Rescheduled')).toBeInTheDocument()
    expect(first.getByRole('link', { name: 'Join the session “Presentación del curso” (opens in a new tab)' })).toBeInTheDocument()
  })
})

describe('la lección de una sesión', () => {
  it('muestra sus sesiones, cómo se completa, y las pestañas enlazan las sesiones y la finalización', async () => {
    fetchMock = mockFetch([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: SESSIONS, body: sessions },
      { method: 'POST', path: `${CLASSROOM}/lessons/lec-sesion/events`, body: { status: 'INICIADA', startedAt: '2026-10-28T15:00:00Z' } }
    ])
    const files = serveFiles({})
    renderWithProviders(<ClassroomPage />, {
      modules: [classroomModule()],
      route: '/mis-cursos/mat-sgspe-1?leccion=lec-sesion',
      path: '/mis-cursos/:enrollmentId'
    })

    const own = within(await screen.findByRole('region', { name: 'La sesión de esta lección' }))
    expect(await own.findAllByRole('article')).toHaveLength(2)
    expect(own.queryByRole('link', { name: 'Ver la lección' })).not.toBeInTheDocument()
    expect(screen.getByText('Se completa al asistir a la sesión.')).toBeInTheDocument()
    expect(screen.queryByText('Esta lección no tiene material.')).not.toBeInTheDocument()

    const tabs = within(screen.getByRole('navigation', { name: 'Secciones del curso' }))
    expect(tabs.getByRole('link', { name: 'Sesiones' })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1/sesiones')
    expect(tabs.getByRole('link', { name: 'Finalización' })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1/finalizacion')
    expect(screen.queryByRole('navigation', { name: 'Más del curso' })).not.toBeInTheDocument()
    files.restore()
  })
})
