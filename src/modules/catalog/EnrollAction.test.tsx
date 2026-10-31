import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { WasichaiModule } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes, useParams } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { CourseDetailPage } from './CourseDetailPage'
import { catalogModule } from './module'
import { courseDetail, problem } from './test/fixtures'

const COURSE = '/lms/public/catalog/courses/srtm-anuncios'
const ENROLLMENTS = '/lms/enrollments'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
// Intl separa el rango con espacios finos: el nombre accesible se compara con una expresión
const ACTION = /^Matricularme en la edición 9 nov\s–\s4 dic 2026$/

// el aula es otro módulo: para la ficha basta que su ruta exista en el registro con la clave 'classroom:classroom'
const classroomStub: WasichaiModule = {
  id: 'classroom',
  routes: [{ id: 'classroom', path: 'mis-cursos/:enrollmentId', chrome: 'shell', component: () => null }]
}

function Classroom() {
  const { enrollmentId } = useParams()
  return <p>{`aula ${enrollmentId}`}</p>
}

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderCourse(routes: MockRoute[], { signedIn = true, modules = [catalogModule(), classroomStub] } = {}) {
  fetchMock = mockFetch([{ path: COURSE, body: courseDetail }, ...routes])
  return renderWithProviders(
    <Routes>
      <Route path="/cursos/:slug" element={<CourseDetailPage />} />
      <Route path="/mis-cursos/:enrollmentId" element={<Classroom />} />
      <Route path="/login" element={<p>inicio de sesión</p>} />
    </Routes>,
    { modules, route: '/cursos/srtm-anuncios', ...(signedIn ? { permissions: { admin: false, objects: {} } } : { user: null, permissions: null }) }
  )
}

const offerings = async () => {
  const heading = await screen.findByRole('heading', { level: 2, name: 'Ediciones' })
  return within(heading.closest('section')!)
}

describe('matricularse desde la ficha', () => {
  it('sin sesión, la edición abierta lleva al inicio de sesión de Wasichai, que vuelve a la ficha', async () => {
    renderCourse([], { signedIn: false })

    const section = await offerings()
    const signIn = section.getByRole('link', { name: 'Inicia sesión para matricularte' })
    expect(signIn).toHaveAttribute('href', '/login?returnTo=%2Fcursos%2Fsrtm-anuncios')
    expect(section.queryByRole('button', { name: ACTION })).not.toBeInTheDocument()

    await userEvent.click(signIn)
    expect(await screen.findByText('inicio de sesión')).toBeInTheDocument()
  })

  it('con sesión matricula con Idempotency-Key y abre el aula de la matrícula', async () => {
    renderCourse([{ method: 'POST', path: ENROLLMENTS, status: 201, body: { id: 'mat-nueva', status: 'ACTIVA' } }])

    await userEvent.click((await offerings()).getByRole('button', { name: ACTION }))

    expect(await screen.findByText('aula mat-nueva')).toBeInTheDocument()
    const post = fetchMock.calls.find((call) => call.method === 'POST')!
    expect(post.path).toBe(ENROLLMENTS)
    expect(post.body).toEqual({ offering: 'edicion-srtm-2026-11' })
    expect(post.headers['idempotency-key']).toMatch(UUID)
  })

  it('si ya estaba matriculada (200), abre la misma matrícula', async () => {
    renderCourse([{ method: 'POST', path: ENROLLMENTS, status: 200, body: { id: 'mat-srtm-1' } }])

    await userEvent.click((await offerings()).getByRole('button', { name: ACTION }))
    expect(await screen.findByText('aula mat-srtm-1')).toBeInTheDocument()
  })

  it.each([
    [409, 'No pudimos matricularte: la inscripción de esta edición está cerrada o ya no quedan plazas.', 'No quedan plazas en esta edición.'],
    [404, 'Esta edición ya no está disponible.', undefined],
    [403, 'Tu cuenta no puede matricularse en cursos. Consulta con tu institución.', undefined],
    [500, 'No pudimos matricularte. Inténtalo de nuevo.', undefined]
  ])('un %i se explica con claridad y deja la ficha a la vista', async (status, message, detail) => {
    renderCourse([{ method: 'POST', path: ENROLLMENTS, status, body: problem(status, 'No quedan plazas en esta edición.') }])

    const section = await offerings()
    await userEvent.click(section.getByRole('button', { name: ACTION }))

    const alert = await section.findByRole('alert')
    expect(alert).toHaveTextContent(message)
    if (detail) expect(alert).toHaveTextContent(detail)
    else expect(alert).not.toHaveTextContent('No quedan plazas en esta edición.')
    expect(screen.getByRole('heading', { level: 1, name: courseDetail.title })).toBeInTheDocument()
    expect(section.getByRole('button', { name: ACTION })).toBeEnabled()
  })

  it('con la sesión caducada (401), core la cierra y el botón pasa a pedir el inicio de sesión', async () => {
    renderCourse([{ method: 'POST', path: ENROLLMENTS, status: 401, body: problem(401, 'Sesión caducada') }])

    await userEvent.click((await offerings()).getByRole('button', { name: ACTION }))

    expect(await screen.findByRole('link', { name: 'Inicia sesión para matricularte' })).toHaveAttribute('href', '/login?returnTo=%2Fcursos%2Fsrtm-anuncios')
    expect(screen.getByRole('heading', { level: 1, name: courseDetail.title })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('una respuesta sin id no navega a ninguna parte', async () => {
    renderCourse([{ method: 'POST', path: ENROLLMENTS, status: 201, body: { status: 'ACTIVA' } }])

    const section = await offerings()
    await userEvent.click(section.getByRole('button', { name: ACTION }))
    expect(await section.findByRole('alert')).toHaveTextContent('No pudimos matricularte. Inténtalo de nuevo.')
  })

  it('solo las ediciones con la inscripción abierta ofrecen matricularse', async () => {
    const closed = { ...courseDetail, offerings: [{ ...courseDetail.offerings[0]!, enrollmentOpen: false }] }
    fetchMock = mockFetch([{ path: COURSE, body: closed }])
    renderWithProviders(<CourseDetailPage />, { modules: [catalogModule(), classroomStub], route: '/cursos/srtm-anuncios', path: '/cursos/:slug' })

    const section = await offerings()
    expect(section.getByText('Inscripción cerrada')).toBeInTheDocument()
    expect(section.queryByRole('button')).not.toBeInTheDocument()
    expect(section.queryByRole('link')).not.toBeInTheDocument()
  })

  it('sin el módulo del aula registrado, la ficha no ofrece matricularse', async () => {
    renderCourse([], { modules: [catalogModule()] })

    const section = await offerings()
    expect(section.getByText('Inscripción abierta')).toBeInTheDocument()
    expect(section.queryByRole('button')).not.toBeInTheDocument()
    await waitFor(() => expect(fetchMock.calls.filter((call) => call.method === 'POST')).toEqual([]))
  })
})
