import { screen, within } from '@testing-library/react'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
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
    const items = await screen.findAllByRole('article')
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual(['Introducción al SGSPE', 'Licencias de anuncios con SRTM'])
    const first = within(items[0]!)
    expect(first.getByRole('link', { name: 'Introducción al SGSPE' })).toHaveAttribute('href', '/revision/ver-sgspe-2')
    expect(first.getByText('SGSPE-101 · versión 2')).toBeInTheDocument()
    expect(first.getByText('En revisión desde el 20 oct 2026')).toBeInTheDocument()
    expect(first.getByText('1 comentario abierto')).toBeInTheDocument()
    expect(first.queryByText('Asignada a ti')).not.toBeInTheDocument()
    const second = within(items[1]!)
    expect(second.getByText('Sin comentarios abiertos')).toBeInTheDocument()
    expect(second.getByText('Asignada a ti')).toBeInTheDocument()
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
    expect(alert).toHaveTextContent('error 500')
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
})
