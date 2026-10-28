import { screen } from '@testing-library/react'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { ClassroomPage } from './ClassroomPage'
import { classroomModule } from './module'
import { classroom, problem } from './test/fixtures'

const CLASSROOM = '/lms/classroom/enrollments/mat-srtm-1'
let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderClassroom(routes: MockRoute[], route = '/mis-cursos/mat-srtm-1') {
  fetchMock = mockFetch(routes)
  return renderWithProviders(<ClassroomPage />, { modules: [classroomModule()], route, path: '/mis-cursos/:enrollmentId' })
}

describe('ClassroomPage', () => {
  it('abre el aula de la matrícula con su progreso', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }])

    expect(await screen.findByRole('heading', { level: 1, name: classroom.course.title })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progreso del curso' })).toHaveAttribute('aria-valuenow', '33')
    expect(screen.getByRole('link', { name: '← Mis cursos' })).toHaveAttribute('href', '/mis-cursos')
  })

  it('una matrícula ajena o inexistente (404) es «No encontramos este curso en tus matrículas», sin reintentar', async () => {
    renderClassroom([{ path: CLASSROOM, status: 404, body: problem(404, 'No existe') }])

    expect(await screen.findByRole('heading', { level: 1, name: 'No encontramos este curso en tus matrículas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Mis cursos' })).toHaveAttribute('href', '/mis-cursos')
  })

  it('un error del servidor se explica con su estado y deja reintentar', async () => {
    renderClassroom([{ path: CLASSROOM, status: 500, body: problem(500, 'fallo') }])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar el aula')
    expect(alert).toHaveTextContent('error 500')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
