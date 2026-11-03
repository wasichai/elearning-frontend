import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Link } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { studioModule } from './module'
import { draftDetail, draftVersion, firstDraftDetail, noLessonsDetail, problem, publishedVersion } from './test/fixtures'
import { VersionsPage } from './VersionsPage'

const VERSIONS = '/lms/studio/versions'

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderVersions(routes: MockRoute[], language?: string) {
  fetchMock = mockFetch(routes)
  return renderWithProviders(<VersionsPage />, { modules: [studioModule()], route: '/estudio', language })
}

describe('VersionsPage: mis versiones', () => {
  it('agrupa mis versiones por curso, con su estado, su fecha y lo que queda por atender', async () => {
    renderVersions([{ path: VERSIONS, body: [draftVersion, publishedVersion] }])

    expect(screen.getByRole('heading', { level: 1, name: 'Mis versiones' })).toBeInTheDocument()
    expect(screen.getByText('Cargando tus versiones…')).toBeInTheDocument()
    const items = await screen.findAllByRole('article')
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual(['Versión 2', 'Versión 1'])
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['Introducción al SGSPE'])
    expect(screen.getByText('SGSPE-101')).toBeInTheDocument()
    const draft = within(items[0]!)
    expect(draft.getByRole('link', { name: 'Introducción al SGSPE — versión 2' })).toHaveAttribute('href', `/estudio/versiones/${draftVersion.id}`)
    expect(draft.getByText('Borrador').closest('[data-state]')).toHaveAttribute('data-state', 'todo')
    expect(draft.getByText(/^Actualizada el 30 oct 2026$/)).toBeInTheDocument()
    expect(draft.queryByText(/por atender/)).not.toBeInTheDocument()
    const published = within(items[1]!)
    expect(published.getByText('Publicada').closest('[data-state]')).toHaveAttribute('data-state', 'done')
    expect(published.getByText('1 comentario por atender')).toBeInTheDocument()
  })

  it('lo que requiere acción va primero, en cada curso y entre cursos', async () => {
    const other = { id: 'c-otro', code: 'SRTM-200', title: 'Curso de SRTM' }
    renderVersions([
      {
        path: VERSIONS,
        body: [
          { ...publishedVersion, id: 'p-1', course: other },
          { ...publishedVersion, id: 'p-2', number: 3 },
          { ...draftVersion, id: 'd-1' },
          { ...draftVersion, id: 'r-1', number: 2, status: 'EN_REVISION', course: other }
        ]
      }
    ])

    await screen.findAllByRole('article')
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['Introducción al SGSPE', 'Curso de SRTM'])
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Versión 2', 'Versión 3', 'Versión 2', 'Versión 1'])
  })

  it('un borrador se envía desde la lista y solo la primera acción es primaria', async () => {
    const user = userEvent.setup()
    fetchMock = mockFetch([
      {
        path: VERSIONS,
        body: [draftVersion, { ...draftVersion, id: 'd-otro', number: 5, course: { id: 'c-otro', code: 'SRTM-200', title: 'Curso de SRTM' } }]
      },
      { path: `${VERSIONS}/${draftVersion.id}`, body: draftDetail },
      { method: 'POST', path: `${VERSIONS}/${draftVersion.id}/submit`, body: { ...draftVersion, status: 'EN_REVISION' } }
    ])
    renderWithProviders(<VersionsPage />, { modules: [studioModule()], route: '/estudio' })

    const first = await screen.findByRole('button', { name: 'Enviar a revisión la versión 2 de Introducción al SGSPE' })
    const second = screen.getByRole('button', { name: 'Enviar a revisión la versión 5 de Curso de SRTM' })
    expect(first).toHaveAttribute('data-variant', 'primary')
    expect(second).toHaveAttribute('data-variant', 'secondary')
    expect(screen.queryByRole('button', { name: /^Nueva versión/ })).not.toBeInTheDocument()

    await user.click(first)
    await user.click(await within(await screen.findByRole('dialog', { name: '¿Enviar a revisión?' })).findByRole('button', { name: 'Sí, enviar a revisión' }))
    await waitFor(() => expect(fetchMock.calls.filter((call) => call.method === 'POST')).toHaveLength(1))
    expect(await screen.findByText('Enviada a revisión.')).toBeInTheDocument()
  })

  describe('un borrador sin lecciones: la lista no sabe cuántas tiene, y lo comprueba al pedir enviar', () => {
    const emptyInList = { ...draftVersion, id: firstDraftDetail.id }
    const SUBMIT = `${VERSIONS}/${firstDraftDetail.id}/submit`
    const NAME = 'Enviar a revisión la versión 2 de Introducción al SGSPE'

    it('mientras comprueba, no se puede confirmar', async () => {
      const user = userEvent.setup()
      renderVersions([{ path: VERSIONS, body: [emptyInList] }])
      // la lectura del detalle no llega nunca
      const reply = globalThis.fetch
      globalThis.fetch = (input, init) => (String(input).endsWith(firstDraftDetail.id) ? new Promise(() => {}) : reply(input, init))

      await user.click(await screen.findByRole('button', { name: NAME }))
      const dialog = await screen.findByRole('dialog', { name: '¿Enviar a revisión?' })
      expect(dialog).toHaveTextContent('Comprobando que la versión tenga lecciones')
      expect(within(dialog).getByRole('button', { name: 'Sí, enviar a revisión' })).toBeDisabled()
    })

    it('sin unidades, explica qué falta, no envía y lleva a añadir la primera unidad', async () => {
      const user = userEvent.setup()
      renderVersions([
        { path: VERSIONS, body: [emptyInList] },
        { path: `${VERSIONS}/${firstDraftDetail.id}`, body: firstDraftDetail }
      ])

      await user.click(await screen.findByRole('button', { name: NAME }))
      const dialog = await screen.findByRole('dialog', { name: 'Aún no se puede enviar a revisión' })
      expect(dialog).toHaveTextContent('no tiene lecciones')
      expect(within(dialog).queryByRole('button', { name: 'Sí, enviar a revisión' })).not.toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Añadir la primera unidad' })).toBeInTheDocument()

      await user.click(within(dialog).getByRole('button', { name: 'Volver' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(screen.getByRole('button', { name: NAME })).toHaveFocus())
      expect(fetchMock.calls.filter((call) => call.path === SUBMIT)).toHaveLength(0)
    })

    it('con unidades sin lecciones, lleva a añadir la primera lección', async () => {
      const user = userEvent.setup()
      renderVersions([
        { path: VERSIONS, body: [emptyInList] },
        { path: `${VERSIONS}/${firstDraftDetail.id}`, body: noLessonsDetail }
      ])

      await user.click(await screen.findByRole('button', { name: NAME }))
      const dialog = await screen.findByRole('dialog', { name: 'Aún no se puede enviar a revisión' })
      expect(within(dialog).getByRole('button', { name: 'Añadir la primera lección' })).toBeInTheDocument()
    })

    it('si no puede comprobarlo, no envía: lo dice y deja volver a comprobar', async () => {
      const user = userEvent.setup()
      const routes: MockRoute[] = [
        { path: VERSIONS, body: [emptyInList] },
        { path: `${VERSIONS}/${firstDraftDetail.id}`, status: 500, body: problem(500, 'fallo') }
      ]
      renderVersions(routes)

      await user.click(await screen.findByRole('button', { name: NAME }))
      const dialog = await screen.findByRole('dialog', { name: '¿Enviar a revisión?' })
      expect(await within(dialog).findByText(/No pudimos comprobar si la versión tiene lecciones/)).toBeInTheDocument()
      routes[1] = { path: `${VERSIONS}/${firstDraftDetail.id}`, body: firstDraftDetail }
      await user.click(within(dialog).getByRole('button', { name: 'Reintentar' }))
      expect(await screen.findByRole('dialog', { name: 'Aún no se puede enviar a revisión' })).toBeInTheDocument()
      expect(fetchMock.calls.filter((call) => call.path === SUBMIT)).toHaveLength(0)
    })

    it('en inglés', async () => {
      const user = userEvent.setup()
      renderVersions(
        [
          { path: VERSIONS, body: [emptyInList] },
          { path: `${VERSIONS}/${firstDraftDetail.id}`, body: firstDraftDetail }
        ],
        'en'
      )

      await user.click(await screen.findByRole('button', { name: 'Send version 2 of Introducción al SGSPE for review' }))
      const dialog = await screen.findByRole('dialog', { name: 'It cannot be sent for review yet' })
      expect(within(dialog).getByRole('button', { name: 'Add the first unit' })).toBeInTheDocument()
    })
  })

  it('un curso sin nada en curso ofrece una versión nueva desde la última; con una en revisión, no', async () => {
    const user = userEvent.setup()
    const other = { id: 'c-otro', code: 'SRTM-200', title: 'Curso de SRTM' }
    fetchMock = mockFetch([
      {
        path: VERSIONS,
        body: [
          { ...publishedVersion, id: 'old', number: 1 },
          { ...publishedVersion, id: 'last', number: 4 },
          { ...draftVersion, id: 'r', status: 'EN_REVISION', course: other }
        ]
      },
      { method: 'POST', path: `/lms/studio/courses/${publishedVersion.course.id}/versions`, status: 201, body: { id: 'nueva', number: 5, status: 'BORRADOR' } }
    ])
    renderWithProviders(<VersionsPage />, { modules: [studioModule()], route: '/estudio' })

    const button = await screen.findByRole('button', { name: 'Nueva versión de Introducción al SGSPE' })
    expect(button).toHaveAttribute('data-variant', 'primary')
    expect(screen.queryByRole('button', { name: 'Nueva versión de Curso de SRTM' })).not.toBeInTheDocument()
    await user.click(button)
    const dialog = await screen.findByRole('dialog', { name: '¿Crear una versión nueva?' })
    expect(dialog).toHaveTextContent('Se copia el contenido de la versión 4')
    await user.click(within(dialog).getByRole('button', { name: 'Sí, crear el borrador' }))
    await waitFor(() => expect(fetchMock.calls.filter((call) => call.method === 'POST').map((call) => call.body)).toEqual([{ fromVersionId: 'last' }]))
  })

  it('enlaza «Nuevo curso» con el permiso de crear curso, sea cual sea el rol', async () => {
    fetchMock = mockFetch([{ path: VERSIONS, body: [] }])
    renderWithProviders(<VersionsPage />, {
      modules: [studioModule()],
      route: '/estudio',
      user: { id: 'u', email: 'u@demo.local', displayName: 'U', organizationId: 'o', roles: ['ESTUDIANTE'] },
      permissions: { admin: false, objects: { curso: ['READ', 'CREATE'], version_curso: ['READ', 'CREATE'] } }
    })

    expect(await screen.findByRole('link', { name: 'Nuevo curso' })).toHaveAttribute('href', '/estudio/cursos/nuevo')
  })

  it.each([
    ['solo lectura de curso', { curso: ['READ', 'UPDATE'], version_curso: ['READ', 'CREATE'] }],
    ['sin curso', { version_curso: ['READ', 'CREATE'] }]
  ])('sin el permiso de crear curso no ofrece «Nuevo curso», aunque su rol se llame CREADOR: %s', async (_case, objects) => {
    fetchMock = mockFetch([{ path: VERSIONS, body: [] }])
    renderWithProviders(<VersionsPage />, {
      modules: [studioModule()],
      route: '/estudio',
      user: { id: 'u', email: 'u@demo.local', displayName: 'U', organizationId: 'o', roles: ['CREADOR'] },
      permissions: { admin: false, objects }
    })

    expect(await screen.findByText('Aún no tienes versiones')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Nuevo curso' })).not.toBeInTheDocument()
  })

  it('sin versiones lo dice con claridad y la primera acción es «Nuevo curso», con un camino que existe', async () => {
    renderVersions([{ path: VERSIONS, body: [] }])

    expect(await screen.findByText('Aún no tienes versiones')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByText(/al guardarlo se abre su primer borrador/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nuevo curso' })).toHaveAttribute('data-variant', 'primary')
  })

  it('con versiones, «Nuevo curso» no compite con la primera acción', async () => {
    renderVersions([{ path: VERSIONS, body: [draftVersion] }])

    await screen.findByRole('article')
    expect(screen.getByRole('link', { name: 'Nuevo curso' })).toHaveAttribute('data-variant', 'secondary')
  })

  it('señala la lista de cursos para un curso sin versiones, sin llamarlos «tuyos»: un curso no tiene dueño en el contrato', async () => {
    fetchMock = mockFetch([{ path: VERSIONS, body: [draftVersion] }])
    renderWithProviders(<VersionsPage />, {
      modules: [studioModule()],
      route: '/estudio',
      permissions: { admin: false, objects: { curso: ['READ'], version_curso: ['READ', 'CREATE'] } }
    })

    expect(await screen.findByRole('link', { name: 'Ver todos los cursos' })).toHaveAttribute('href', '/data/objects/curso/records')
    expect(screen.getByText(/incluye los de todas las personas/)).toBeInTheDocument()
    expect(screen.queryByText(/al guardarlo se abre/)).not.toBeInTheDocument()
  })

  it('sin permiso de leer cursos no los señala', async () => {
    fetchMock = mockFetch([{ path: VERSIONS, body: [] }])
    renderWithProviders(<VersionsPage />, {
      modules: [studioModule()],
      route: '/estudio',
      permissions: { admin: false, objects: { version_curso: ['READ', 'CREATE'] } }
    })

    expect(await screen.findByText('Aún no tienes versiones')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver todos los cursos' })).not.toBeInTheDocument()
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
