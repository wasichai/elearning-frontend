import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Link } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { studioModule } from './module'
import { draftVersion, problem, publishedVersion } from './test/fixtures'
import { VersionsPage } from './VersionsPage'

const VERSIONS = '/lms/studio/versions'

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderVersions(routes: MockRoute[], language?: string) {
  fetchMock = mockFetch(routes)
  return renderWithProviders(<VersionsPage />, { modules: [studioModule()], route: '/estudio', language })
}

describe('VersionsPage: mis versiones', () => {
  it('lista mis versiones en el orden del servidor, con su estado, su fecha y lo que queda por atender', async () => {
    renderVersions([{ path: VERSIONS, body: [draftVersion, publishedVersion] }])

    expect(screen.getByRole('heading', { level: 1, name: 'Mis versiones' })).toBeInTheDocument()
    expect(screen.getByText('Cargando tus versiones…')).toBeInTheDocument()
    const items = await screen.findAllByRole('article')
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual([
      'Introducción al SGSPE — versión 2',
      'Introducción al SGSPE — versión 1'
    ])
    const draft = within(items[0]!)
    expect(draft.getByRole('link', { name: 'Introducción al SGSPE — versión 2' })).toHaveAttribute('href', `/estudio/versiones/${draftVersion.id}`)
    expect(draft.getByText('Borrador')).toBeInTheDocument()
    expect(draft.getByText(/^Actualizada el 30 oct 2026$/)).toBeInTheDocument()
    expect(draft.queryByText(/por atender/)).not.toBeInTheDocument()
    const published = within(items[1]!)
    expect(published.getByText('Publicada')).toBeInTheDocument()
    expect(published.getByText('1 comentario por atender')).toBeInTheDocument()
  })

  it('sin versiones lo dice con claridad', async () => {
    renderVersions([{ path: VERSIONS, body: [] }])

    expect(await screen.findByText('Aún no tienes versiones')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('un error del servidor se explica y deja reintentar; un contrato roto no muestra datos a medias', async () => {
    const first = renderVersions([{ path: VERSIONS, status: 500, body: problem(500, 'fallo') }])
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar tus versiones')
    expect(alert).toHaveTextContent('error 500')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    first.unmount()
    fetchMock.restore()

    renderVersions([{ path: VERSIONS, body: [{ ...draftVersion, status: 'ARCHIVADA' }] }])
    expect(await screen.findByText('No pudimos leer la respuesta del servidor')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('enlaza la importación para quien puede importar; a quien no, no se la ofrece', async () => {
    const first = renderVersions([{ path: VERSIONS, body: [] }])
    expect(screen.getByRole('link', { name: 'Importar desde un repositorio' })).toHaveAttribute('href', '/estudio/importar')
    first.unmount()
    fetchMock.restore()

    fetchMock = mockFetch([{ path: VERSIONS, body: [] }])
    renderWithProviders(<VersionsPage />, {
      modules: [studioModule()],
      route: '/estudio',
      permissions: { admin: false, objects: { version_curso: ['READ', 'CREATE', 'UPDATE'], leccion: ['READ', 'UPDATE'] } }
    })
    expect(await screen.findByText('Aún no tienes versiones')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Importar desde un repositorio' })).not.toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderVersions([{ path: VERSIONS, body: [publishedVersion] }], 'en')

    expect(screen.getByRole('heading', { level: 1, name: 'My versions' })).toBeInTheDocument()
    expect(await screen.findByText('Published')).toBeInTheDocument()
    expect(screen.getByText('1 comment to address')).toBeInTheDocument()
  })

  // el menú lleva a la misma ruta: la página no se vuelve a montar y solo cambia la entrada del historial (#76)
  it('con la lista abierta, volver a pulsar su entrada del menú la vuelve a pedir y pinta lo nuevo', async () => {
    const routes: MockRoute[] = [{ path: VERSIONS, body: [draftVersion] }]
    fetchMock = mockFetch(routes)
    renderWithProviders(
      <>
        <Link to="/estudio">Menú</Link>
        <VersionsPage />
      </>,
      { modules: [studioModule()], route: '/estudio' }
    )
    expect(await screen.findAllByRole('article')).toHaveLength(1)
    expect(fetchMock.calls.filter((call) => call.path === VERSIONS)).toHaveLength(1)

    routes[0] = { path: VERSIONS, body: [draftVersion, publishedVersion] }
    await userEvent.click(screen.getByRole('link', { name: 'Menú' }))

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2))
    expect(fetchMock.calls.filter((call) => call.path === VERSIONS)).toHaveLength(2)
  })
})
