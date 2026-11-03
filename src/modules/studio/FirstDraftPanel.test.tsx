import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { FirstDraftPanel } from './FirstDraftPanel'
import { studioModule } from './module'
import { courseDefinition, firstDraftDetail, newCourseRecord, problem } from './test/fixtures'

// la vuelta a un curso sin versiones: al final de su ficha en core, con permiso de crear versiones

const COURSE = newCourseRecord.id
const VERSIONS = '/objects/version_curso/records'
const DRAFT = `/lms/studio/courses/${COURSE}/versions`
const AUTHOR = { curso: ['READ'], version_curso: ['READ', 'CREATE'] }
const BUTTON = { name: 'Crear primer borrador' }

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderPanel(routes: MockRoute[], { objectName = 'curso', objects = AUTHOR }: { objectName?: string; objects?: Record<string, string[]> } = {}) {
  fetchMock = mockFetch(routes)
  const panel = <FirstDraftPanel objectName={objectName} definition={courseDefinition as never} record={newCourseRecord} />
  return renderWithProviders(
    <Routes>
      <Route path="/data/objects/curso/records/:id" element={panel} />
      <Route path="/estudio/versiones/:id" element={<p>Borrador abierto</p>} />
    </Routes>,
    { modules: [studioModule()], route: `/data/objects/curso/records/${COURSE}`, permissions: { admin: false, objects } }
  )
}

const checks = () => fetchMock.calls.filter((call) => call.url.includes(VERSIONS))

const noVersions: MockRoute = { path: VERSIONS, body: { content: [] } }
const oneVersion: MockRoute = { path: VERSIONS, body: { content: [{ id: 'v' }] } }

describe('FirstDraftPanel', () => {
  it('un curso sin versiones ofrece su primer borrador y lo abre; consulta solo las versiones de ese curso', async () => {
    const user = userEvent.setup()
    renderPanel([noVersions, { method: 'POST', path: DRAFT, status: 201, body: firstDraftDetail }])

    await user.click(await screen.findByRole('button', BUTTON))

    expect(await screen.findByText('Borrador abierto')).toBeInTheDocument()
    expect(new URL(checks()[0]!.url, 'http://x').searchParams.get('curso')).toBe(COURSE)
    expect(fetchMock.calls.find((call) => call.method === 'POST')?.body).toEqual({ fromVersionId: null })
  })

  it('un curso con versiones no lo ofrece: sin versión de origen, el servidor copiaría la última', async () => {
    renderPanel([oneVersion])

    await waitFor(() => expect(checks()).toHaveLength(1))
    await waitFor(() => expect(screen.queryByRole('button', BUTTON)).not.toBeInTheDocument())
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it.each([
    ['otro objeto', { objectName: 'leccion' }],
    ['sin permiso de crear versiones', { objects: { curso: ['READ'], version_curso: ['READ'] } }]
  ])('no aparece ni consulta nada: %s', async (_case, options) => {
    renderPanel([noVersions], options)

    await waitFor(() => expect(screen.queryByRole('button', BUTTON)).not.toBeInTheDocument())
    expect(checks()).toHaveLength(0)
  })

  it('si no se puede saber si tiene versiones, no lo ofrece y deja reintentar', async () => {
    const user = userEvent.setup()
    const routes: MockRoute[] = [{ path: VERSIONS, status: 500, body: problem(500, 'fallo') }]
    renderPanel(routes)

    expect(await screen.findByText('No pudimos comprobar si este curso tiene versiones.')).toBeInTheDocument()
    expect(screen.queryByRole('button', BUTTON)).not.toBeInTheDocument()
    routes[0] = noVersions
    fetchMock.restore()
    fetchMock = mockFetch(routes)
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('button', BUTTON)).toBeInTheDocument()
  })

  it('un 403 lo explica y retira el botón', async () => {
    const user = userEvent.setup()
    renderPanel([noVersions, { method: 'POST', path: DRAFT, status: 403, body: problem(403, 'no') }])

    await user.click(await screen.findByRole('button', BUTTON))

    expect(await screen.findByText(/No tienes permiso para crear versiones/)).toBeInTheDocument()
    expect(screen.queryByRole('button', BUTTON)).not.toBeInTheDocument()
  })

  it('un 409 dice que ya hay una versión, aunque esta persona no la vea, y lleva a «Mis versiones»', async () => {
    const user = userEvent.setup()
    renderPanel([noVersions, { method: 'POST', path: DRAFT, status: 409, body: problem(409, 'duplicada') }])

    await user.click(await screen.findByRole('button', BUTTON))

    expect(await screen.findByText(/ya tiene una versión/)).toBeInTheDocument()
    expect(screen.queryByRole('button', BUTTON)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a mis versiones' })).toHaveAttribute('href', '/estudio')
  })

  it('un fallo de red se explica y deja volver a intentarlo', async () => {
    const user = userEvent.setup()
    fetchMock = mockFetch([noVersions])
    renderWithProviders(<FirstDraftPanel objectName="curso" definition={courseDefinition as never} record={newCourseRecord} />, {
      modules: [studioModule()],
      route: '/x',
      permissions: { admin: false, objects: AUTHOR }
    })
    const button = await screen.findByRole('button', BUTTON)
    const original = globalThis.fetch
    globalThis.fetch = () => Promise.reject(new TypeError('sin red'))
    try {
      await user.click(button)
      expect(await screen.findByText(/No hay conexión con el servidor/)).toBeInTheDocument()
      expect(screen.getByRole('button', BUTTON)).toBeEnabled()
    } finally {
      globalThis.fetch = original
    }
  })
})
