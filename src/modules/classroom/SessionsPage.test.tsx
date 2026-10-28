import { screen, within } from '@testing-library/react'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { ClassroomPage } from './ClassroomPage'
import { classroomModule } from './module'
import { SessionsPage } from './SessionsPage'
import { serveFiles } from './test/files'
import { assessmentClassroom, problem, sessions } from './test/fixtures'

// las sesiones en vivo de una matrícula (ADR-0016): horas en la zona de la edición, estado, enlace https y asistencia

const CLASSROOM = '/lms/classroom/enrollments/mat-sgspe-1'
const SESSIONS = `${CLASSROOM}/sessions`

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

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
    expect(screen.getByText('Sesiones en vivo')).toBeInTheDocument()
    expect(await screen.findByText(/^Horas en hora (estándar )?de Perú$/)).toBeInTheDocument()
    expect(screen.getAllByRole('article').map((article) => article.getAttribute('aria-label'))).toEqual([
      'Presentación del curso',
      'Consulta de la unidad',
      'Recuperación de la consulta'
    ])
    // 13:00 UTC son las 08:00 en Lima, se mire desde donde se mire
    const first = within(await session('Presentación del curso'))
    expect(first.getByText(/martes, 8 de septiembre de 2026, 8:00.9:30/)).toBeInTheDocument()
    expect(first.getByText('Reprogramada')).toBeInTheDocument()
    expect(first.getByText('Teoría · Virtual')).toBeInTheDocument()
    expect(first.getByText('presente')).toBeInTheDocument()
    const join = first.getByRole('link', { name: 'Entrar a la sesión «Presentación del curso» (se abre en otra pestaña)' })
    expect(join).toHaveAttribute('href', 'https://meet.example/sgspe-1')
    expect(join).toHaveAttribute('target', '_blank')
    expect(join).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('una cancelada se dice y no ofrece enlace ni asistencia; la recuperación dice dónde y qué recupera', async () => {
    renderSessions([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: SESSIONS, body: sessions }
    ])

    const cancelled = within(await session('Consulta de la unidad'))
    expect(cancelled.getByText('Cancelada')).toBeInTheDocument()
    expect(cancelled.queryByRole('link', { name: /Entrar/ })).not.toBeInTheDocument()
    expect(cancelled.queryByText(/Tu asistencia/)).not.toBeInTheDocument()
    expect(cancelled.getByRole('link', { name: 'Ver la lección' })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1?leccion=lec-sesion')

    const recovery = within(await session('Recuperación de la consulta'))
    expect(recovery.getByText('Recuperación · Presencial · Aula 204, sede central')).toBeInTheDocument()
    expect(recovery.getByText('Recupera «Consulta de la unidad»')).toBeInTheDocument()
    expect(recovery.getByText('aún sin registrar')).toBeInTheDocument()
    expect(recovery.queryByText('Programada')).not.toBeInTheDocument()
  })

  it('sin sesiones lo dice', async () => {
    renderSessions([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: SESSIONS, body: [] }
    ])

    expect(await screen.findByText('Este curso no tiene sesiones en vivo.')).toBeInTheDocument()
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
    expect(first.getByText(/September 8, 2026.*8:00.*9:30/)).toBeInTheDocument()
    expect(first.getByText('Rescheduled')).toBeInTheDocument()
    expect(first.getByRole('link', { name: 'Join the session “Presentación del curso” (opens in a new tab)' })).toBeInTheDocument()
  })
})

describe('la lección de una sesión', () => {
  it('muestra sus sesiones, cómo se completa, y el aula enlaza las sesiones y la finalización', async () => {
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

    const more = within(screen.getByRole('navigation', { name: 'Más del curso' }))
    expect(more.getByRole('link', { name: 'Sesiones en vivo' })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1/sesiones')
    expect(more.getByRole('link', { name: 'Finalización y certificado' })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1/finalizacion')
    files.restore()
  })
})
