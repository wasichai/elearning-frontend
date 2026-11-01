import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Link } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { teachingModule } from './module'
import { OfferingsPage } from './OfferingsPage'
import { offering, otherOffering, problem } from './test/fixtures'

const OFFERINGS = '/lms/teaching/offerings'

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderOfferings(routes: MockRoute[], language?: string) {
  fetchMock = mockFetch(routes)
  return renderWithProviders(<OfferingsPage />, { modules: [teachingModule()], route: '/docencia', language })
}

describe('OfferingsPage: mis ediciones', () => {
  it('lista las ediciones asignadas por inicio, con sus fechas en su zona, matriculados y lo que queda por corregir', async () => {
    renderOfferings([{ path: OFFERINGS, body: [otherOffering, offering] }])

    expect(screen.getByRole('heading', { level: 1, name: 'Mis ediciones' })).toBeInTheDocument()
    expect(screen.getByText('Cargando tus ediciones…')).toBeInTheDocument()
    const items = await screen.findAllByRole('article')
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual(['Introducción al SGSPE', 'Licencias de anuncios con SRTM'])
    const first = within(items[0]!)
    expect(first.getByRole('link', { name: 'Introducción al SGSPE' })).toHaveAttribute('href', '/docencia/edicion-sgspe-2026-09')
    expect(first.getByText('SGSPE-101 · edición edicion-sgspe-2026-09')).toBeInTheDocument()
    expect(first.getByText('7 sept – 16 oct 2026')).toBeInTheDocument()
    expect(first.getByText('2 matriculados')).toBeInTheDocument()
    expect(first.getByText('1 intento por corregir')).toBeInTheDocument()
    expect(within(items[1]!).getByText('Nada por corregir')).toBeInTheDocument()
    expect(fetchMock.calls.map((call) => call.path)).toContain(OFFERINGS)
  })

  it('sin ediciones asignadas lo dice con claridad', async () => {
    renderOfferings([{ path: OFFERINGS, body: [] }])

    expect(await screen.findByText('No tienes ediciones asignadas')).toBeInTheDocument()
    expect(screen.getByText(/Cuando la coordinación te asigne/)).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('un error del servidor se explica y deja reintentar', async () => {
    renderOfferings([{ path: OFFERINGS, status: 500, body: problem(500, 'fallo') }])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar tus ediciones')
    expect(alert).toHaveTextContent('error 500')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('una respuesta fuera de contrato no muestra datos a medias', async () => {
    renderOfferings([{ path: OFFERINGS, body: [{ ...offering, enrolled: '2' }] }])

    expect(await screen.findByText('No pudimos leer la respuesta del servidor')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderOfferings([{ path: OFFERINGS, body: [offering] }], 'en')

    expect(screen.getByRole('heading', { level: 1, name: 'My offerings' })).toBeInTheDocument()
    expect(await screen.findByText('2 students')).toBeInTheDocument()
    expect(screen.getByText('1 attempt to grade')).toBeInTheDocument()
    expect(screen.getByText('Sep 7 – Oct 16, 2026')).toBeInTheDocument()
  })

  // el menú lleva a la misma ruta: la página no se vuelve a montar y solo cambia la entrada del historial (#76)
  it('con la lista abierta, volver a pulsar su entrada del menú la vuelve a pedir y pinta lo nuevo', async () => {
    const routes: MockRoute[] = [{ path: OFFERINGS, body: [offering] }]
    fetchMock = mockFetch(routes)
    renderWithProviders(
      <>
        <Link to="/docencia">Menú</Link>
        <OfferingsPage />
      </>,
      { modules: [teachingModule()], route: '/docencia' }
    )
    expect(await screen.findAllByRole('article')).toHaveLength(1)
    expect(fetchMock.calls.filter((call) => call.path === OFFERINGS)).toHaveLength(1)

    routes[0] = { path: OFFERINGS, body: [offering, otherOffering] }
    await userEvent.click(screen.getByRole('link', { name: 'Menú' }))

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2))
    expect(fetchMock.calls.filter((call) => call.path === OFFERINGS)).toHaveLength(2)
  })
})
