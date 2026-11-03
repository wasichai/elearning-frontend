import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { studioModule } from './module'
import { NewCoursePage } from './NewCoursePage'
import { courseDefinition, firstDraftDetail, newCourseRecord, problem } from './test/fixtures'

// de «Nuevo curso» al primer borrador: el formulario de metadatos de core y, al guardarlo, POST studio/courses/{id}/versions (#270)

const DEFINITION = '/metadata/objects/curso'
const COURSES = '/objects/curso/records'
const DRAFT = `/lms/studio/courses/${newCourseRecord.id}/versions`
const AUTHOR = { curso: ['READ', 'CREATE'], version_curso: ['READ', 'CREATE'] }

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderPage(routes: MockRoute[], objects: Record<string, string[]> = AUTHOR, language?: string) {
  fetchMock = mockFetch([{ path: DEFINITION, body: courseDefinition }, { method: 'POST', path: COURSES, status: 201, body: newCourseRecord }, ...routes])
  return renderWithProviders(
    <Routes>
      <Route path="/estudio/cursos/nuevo" element={<NewCoursePage />} />
      <Route path="/estudio/versiones/:id" element={<p>Borrador abierto</p>} />
      <Route path="/data/objects/curso/records/:id" element={<p>Ficha del curso</p>} />
    </Routes>,
    { modules: [studioModule()], route: '/estudio/cursos/nuevo', permissions: { admin: false, objects }, language }
  )
}

async function fillAndSave() {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText(/Código/), 'NUEVO-101')
  await user.type(screen.getByLabelText(/Identificador/), 'nuevo-101')
  await user.type(screen.getByLabelText(/Título/), 'Curso nuevo')
  await user.click(screen.getByRole('button', { name: 'Guardar' }))
  return user
}

const posts = () => fetchMock.calls.filter((call) => call.method === 'POST')

describe('NewCoursePage: de «Nuevo curso» al primer borrador', () => {
  it('guarda el curso, crea su borrador vacío sin versión de origen y lo abre', async () => {
    renderPage([{ method: 'POST', path: DRAFT, status: 201, body: firstDraftDetail }])

    expect(screen.getByRole('heading', { level: 1, name: 'Nuevo curso' })).toBeInTheDocument()
    await fillAndSave()

    expect(await screen.findByText('Borrador abierto')).toBeInTheDocument()
    expect(posts().map((call) => call.path)).toEqual([COURSES, DRAFT])
    expect(posts()[1]!.body).toEqual({ fromVersionId: null })
  })

  it('si el servidor rechaza el curso, se queda en el formulario y no pide ningún borrador', async () => {
    fetchMock = mockFetch([
      { path: DEFINITION, body: courseDefinition },
      { method: 'POST', path: COURSES, status: 400, body: problem(400, 'Ya existe ese código') }
    ])
    renderWithProviders(<NewCoursePage />, { modules: [studioModule()], route: '/estudio/cursos/nuevo', permissions: { admin: false, objects: AUTHOR } })

    await fillAndSave()

    expect(await screen.findByText('Ya existe ese código')).toBeInTheDocument()
    expect(posts().map((call) => call.path)).toEqual([COURSES])
  })

  it('un fallo de red al crear el borrador no pierde el curso: reintentar no lo vuelve a crear', async () => {
    const routes: MockRoute[] = [{ method: 'POST', path: DRAFT, status: 500, body: problem(500, 'fallo') }]
    renderPage(routes)
    const user = await fillAndSave()

    expect(await screen.findByText(/El curso «Curso nuevo» se guardó/)).toBeInTheDocument()
    expect(screen.getByText('No pudimos crear el borrador (error 500). Inténtalo de nuevo.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir el curso' })).toHaveAttribute('href', `/data/objects/curso/records/${newCourseRecord.id}`)
    routes[0] = { method: 'POST', path: DRAFT, status: 201, body: firstDraftDetail }
    fetchMock.restore()
    fetchMock = mockFetch(routes)
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Borrador abierto')).toBeInTheDocument()
    expect(posts().map((call) => call.path)).toEqual([DRAFT])
  })

  it.each([
    [403, /No tienes permiso para crear versiones/],
    [409, /ya tiene una versión/],
    [404, /ya no existe/]
  ])('un %i no se reintenta: se explica y deja ir al curso', async (status, text) => {
    renderPage([{ method: 'POST', path: DRAFT, status, body: problem(status, 'no') }])
    await fillAndSave()

    expect(await screen.findByText(text)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a mis versiones' })).toHaveAttribute('href', '/estudio')
  })

  it('quien puede crear cursos pero no versiones no pide borrador: va a la ficha del curso, por permiso y no por rol', async () => {
    renderPage([], { curso: ['READ', 'CREATE'], version_curso: ['READ'] })
    await fillAndSave()

    expect(await screen.findByText('Ficha del curso')).toBeInTheDocument()
    expect(posts().map((call) => call.path)).toEqual([COURSES])
  })

  it('sin metadatos del curso lo dice y deja reintentar', async () => {
    fetchMock = mockFetch([{ path: DEFINITION, status: 500, body: problem(500, 'fallo') }])
    renderWithProviders(<NewCoursePage />, { modules: [studioModule()], route: '/estudio/cursos/nuevo', permissions: { admin: false, objects: AUTHOR } })

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderPage([{ method: 'POST', path: DRAFT, status: 201, body: firstDraftDetail }], AUTHOR, 'en')

    expect(screen.getByRole('heading', { level: 1, name: 'New course' })).toBeInTheDocument()
  })
})
