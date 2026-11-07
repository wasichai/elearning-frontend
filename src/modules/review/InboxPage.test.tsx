import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Link } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { InboxPage } from './InboxPage'
import { reviewModule } from './module'
import { otherVersionInReview, problem, versionInReview } from './test/fixtures'

const INBOX = '/lms/review/versions'

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderInbox(routes: MockRoute[], language?: string) {
  fetchMock = mockFetch(routes)
  return renderWithProviders(<InboxPage />, { modules: [reviewModule()], route: '/revision', language })
}

describe('InboxPage: la bandeja del revisor', () => {
  it('lista lo que espera revisión en el orden del servidor, con su versión, desde cuándo y sus comentarios abiertos', async () => {
    renderInbox([{ path: INBOX, body: [versionInReview, otherVersionInReview] }])

    expect(screen.getByRole('heading', { level: 1, name: 'Bandeja de revisión' })).toBeInTheDocument()
    expect(screen.getByText('Cargando la bandeja…')).toBeInTheDocument()
    // la forma de la lista mientras llega, no una línea de texto en una pantalla vacía
    expect(screen.getByRole('status')).toHaveTextContent('Cargando la bandeja…')
    expect(document.querySelector("[data-slot='list-skeleton']")).not.toBeNull()
    const items = await screen.findAllByRole('article')
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual(['Introducción al SGSPE', 'Licencias de anuncios con SRTM'])
    const first = within(items[0]!)
    expect(first.getByRole('link', { name: 'Introducción al SGSPE' })).toHaveAttribute('href', '/revision/ver-sgspe-2')
    expect(first.getByText('SGSPE-101 · versión 2')).toBeInTheDocument()
    expect(first.getByText('En revisión desde el 20 oct 2026')).toBeInTheDocument()
    expect(first.getByText('1 comentario abierto').closest('[data-state]')).toHaveAttribute('data-state', 'warning')
    expect(first.getByText('En revisión').closest('[data-state]')).toHaveAttribute('data-state', 'review')
    // una sola primaria: revisar la que más espera. el contrato no da el nombre del autor
    expect(first.getByRole('link', { name: 'Revisar SGSPE-101, versión 2' })).toHaveAttribute('data-variant', 'primary')
    expect(first.getByRole('link', { name: 'Revisar SGSPE-101, versión 2' })).toHaveAttribute('href', '/revision/ver-sgspe-2')
    expect(first.queryByText('u-creador')).not.toBeInTheDocument()
    expect(first.queryByText('Asignada a ti')).not.toBeInTheDocument()
    const second = within(items[1]!)
    expect(second.getByText('Sin comentarios abiertos')).toBeInTheDocument()
    expect(second.getByText('Asignada a ti')).toBeInTheDocument()
    expect(second.getByRole('link', { name: 'Revisar SRTM-ANU-101, versión 1' })).toHaveAttribute('data-variant', 'secondary')
  })

  it('sin nada que revisar lo dice con claridad', async () => {
    renderInbox([{ path: INBOX, body: [] }])

    expect(await screen.findByText('No hay versiones esperando tu revisión')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('sin permiso de aprobar (403) se explica sin culpar a los datos', async () => {
    renderInbox([{ path: INBOX, status: 403, body: problem(403, 'Sin permiso') }])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No tienes permiso para revisar versiones')
    expect(alert).toHaveTextContent('Revisar versiones exige el permiso de aprobar')
  })

  it('un error del servidor se explica y deja reintentar; una respuesta fuera de contrato no se pinta a medias', async () => {
    const first = renderInbox([{ path: INBOX, status: 500, body: problem(500, 'fallo') }])
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar la bandeja')
    expect(alert).toHaveTextContent('Código del error: 500')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    first.unmount()
    fetchMock.restore()

    renderInbox([{ path: INBOX, body: [{ ...versionInReview, status: 'ARCHIVADA' }] }])
    expect(await screen.findByText('No pudimos leer la respuesta del servidor')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderInbox([{ path: INBOX, body: [versionInReview] }], 'en')

    expect(screen.getByRole('heading', { level: 1, name: 'Review inbox' })).toBeInTheDocument()
    expect(await screen.findByText('SGSPE-101 · version 2')).toBeInTheDocument()
    expect(screen.getByText('1 open comment')).toBeInTheDocument()
    expect(screen.getByText('In review since Oct 20, 2026')).toBeInTheDocument()
  })

  // el menú lleva a la misma ruta: la página no se vuelve a montar y solo cambia la entrada del historial (#76)
  it('con la bandeja abierta, volver a pulsar su entrada del menú la vuelve a pedir y pinta lo nuevo', async () => {
    const routes: MockRoute[] = [{ path: INBOX, body: [versionInReview] }]
    fetchMock = mockFetch(routes)
    renderWithProviders(
      <>
        <Link to="/revision">Menú</Link>
        <InboxPage />
      </>,
      { modules: [reviewModule()], route: '/revision' }
    )
    expect(await screen.findAllByRole('article')).toHaveLength(1)
    expect(fetchMock.calls.filter((call) => call.path === INBOX)).toHaveLength(1)

    routes[0] = { path: INBOX, body: [versionInReview, otherVersionInReview] }
    await userEvent.click(screen.getByRole('link', { name: 'Menú' }))

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2))
    expect(fetchMock.calls.filter((call) => call.path === INBOX)).toHaveLength(2)
  })
})

// RF-IA-03, RF-IA-08: de dónde salió el borrador, como información; no cambia lo que se puede hacer
describe('InboxPage: el origen del borrador', () => {
  it('distingue lo generado con IA, lo generado sin IA (ilustrativo) y lo escrito a mano, sin tocar «Revisar»', async () => {
    renderInbox([
      {
        path: INBOX,
        body: [
          { ...versionInReview, generator: 'DETERMINISTIC' },
          { ...otherVersionInReview, generator: 'MODEL' },
          { ...versionInReview, id: 'ver-sgspe-3', number: 3, generator: null }
        ]
      }
    ])

    const [deterministic, model, manual] = (await screen.findAllByRole('article')).map((item) => within(item))
    expect(deterministic!.getByText('Generado sin IA, ilustrativo').closest('[data-generator]')).toHaveAttribute('data-generator', 'DETERMINISTIC')
    expect(deterministic!.queryByText('Generado con IA')).not.toBeInTheDocument()
    expect(model!.getByText('Generado con IA').closest('[data-generator]')).toHaveAttribute('data-generator', 'MODEL')
    expect(model!.queryByText('Generado sin IA, ilustrativo')).not.toBeInTheDocument()
    expect(manual!.queryByText(/^Generado/)).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-generator]')).toHaveLength(2)
    expect(deterministic!.getByRole('link', { name: 'Revisar SGSPE-101, versión 2' })).toBeInTheDocument()
  })

  it('un backend que aún no manda el origen se lee como escrito a mano', async () => {
    const withoutGenerator = Object.fromEntries(Object.entries(versionInReview).filter(([key]) => key !== 'generator'))
    renderInbox([{ path: INBOX, body: [withoutGenerator] }])

    expect(await screen.findByRole('article')).toBeInTheDocument()
    expect(document.querySelector('[data-generator]')).toBeNull()
  })

  it('en inglés', async () => {
    renderInbox(
      [
        {
          path: INBOX,
          body: [
            { ...versionInReview, generator: 'DETERMINISTIC' },
            { ...otherVersionInReview, generator: 'MODEL' }
          ]
        }
      ],
      'en'
    )

    expect(await screen.findByText('Generated without AI, illustrative')).toBeInTheDocument()
    expect(screen.getByText('AI-generated')).toBeInTheDocument()
  })
})
