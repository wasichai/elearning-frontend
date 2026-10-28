import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import type { WasichaiModule } from '@wasichai/core'
import { afterEach, describe, expect, it } from 'vitest'
import { classroomModule } from './module'
import { MyCoursesPage } from './MyCoursesPage'
import { enrollment, finishedEnrollment, otherEnrollment, problem } from './test/fixtures'

const ENROLLMENTS = '/lms/classroom/enrollments'
let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

// el catálogo es otro módulo: para el enlace del estado vacío basta registrar una ruta con su clave
const catalogStub: WasichaiModule = { id: 'catalog', routes: [{ id: 'courses', path: 'cursos', chrome: 'public', component: () => null }] }

function renderPage(routes: MockRoute[], modules: WasichaiModule[] = [classroomModule(), catalogStub]) {
  fetchMock = mockFetch(routes)
  return renderWithProviders(<MyCoursesPage />, { modules, route: '/mis-cursos', permissions: { admin: false, objects: {} } })
}

const item = (title: string) => screen.getByRole('heading', { level: 2, name: title }).closest('article')!

describe('MyCoursesPage', () => {
  it('dice que está cargando mientras llega la respuesta', async () => {
    renderPage([{ path: ENROLLMENTS, body: [enrollment] }])

    expect(screen.getByText('Cargando tus cursos…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: enrollment.course.title })).toBeInTheDocument()
  })

  it('pinta cada matrícula con su edición en su zona, su progreso y «Continuar» a la siguiente lección', async () => {
    renderPage([{ path: ENROLLMENTS, body: [enrollment, otherEnrollment] }])

    expect(screen.getByRole('heading', { level: 1, name: 'Mis cursos' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: enrollment.course.title })).toBeInTheDocument()
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

    expect(await screen.findByRole('heading', { level: 2, name: finishedEnrollment.course.title })).toBeInTheDocument()
    const card = within(item(finishedEnrollment.course.title))
    expect(card.getByText('Has completado todas las lecciones disponibles.')).toBeInTheDocument()
    expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(card.getByRole('link', { name: 'Repasar «Tributos locales»' })).toHaveAttribute('href', '/mis-cursos/mat-done-1')
    expect(card.queryByRole('link', { name: /^Continuar/ })).not.toBeInTheDocument()
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
    fetchMock = mockFetch([{ path: ENROLLMENTS, body: [enrollment] }])
    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { level: 2, name: enrollment.course.title })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('una respuesta fuera de contrato no pinta datos a medias', async () => {
    renderPage([{ path: ENROLLMENTS, body: [{ ...enrollment, progress: { completedLessons: 1 } }] }])

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos leer la respuesta del servidor')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
