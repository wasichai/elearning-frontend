import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { LandingPage } from './LandingPage'
import { catalogModule } from './module'
import { learningGroup } from './test/learningGroup'
import { coursePage, courseSummary, courseWithoutOffering, emptyPage, problem } from './test/fixtures'

let fetchMock: FetchMock

afterEach(() => fetchMock?.restore())

function Location() {
  const location = useLocation()
  return <span data-testid="location">{location.pathname + location.search}</span>
}

const featured = { ...courseSummary, featured: true }
const programming = {
  ...courseWithoutOffering,
  slug: 'python-basico',
  code: 'PY-101',
  title: 'Python básico',
  category: { slug: 'programacion', name: 'Programación' }
}

// el banner, el resumen del catálogo (cifras y áreas) y una fila por área, como los pide la portada
const routes: MockRoute[] = [
  { path: /\/lms\/public\/catalog\/courses\?.*featured=true/, body: { ...coursePage, content: [featured], totalElements: 1 } },
  { path: /\/lms\/public\/catalog\/courses\?.*category=gestion-municipal/, body: coursePage },
  { path: /\/lms\/public\/catalog\/courses\?.*category=programacion/, body: { ...coursePage, content: [programming], totalElements: 1 } },
  { path: '/lms/public/catalog/courses', body: { ...coursePage, totalElements: 5 } }
]

function renderLanding(mocked: MockRoute[] = routes) {
  fetchMock = mockFetch(mocked)
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/cursos" element={<p>catálogo</p>} />
        <Route path="/cursos/:slug" element={<p>ficha</p>} />
      </Routes>
      <Location />
    </>,
    { modules: [catalogModule(), learningGroup], config: { appName: 'Aula Abierta' }, route: '/', user: null, permissions: null }
  )
}

describe('LandingPage', () => {
  it('abre con el curso destacado y lleva a su ficha', async () => {
    const user = userEvent.setup()
    renderLanding()

    const hero = await screen.findByRole('region', { name: featured.title })
    expect(within(hero).getByText('Curso destacado')).toBeInTheDocument()
    expect(within(hero).getByText(featured.summary)).toBeInTheDocument()
    await user.click(within(hero).getByRole('link', { name: 'Ver el curso' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/cursos/srtm-anuncios')
  })

  it('sin destacados, el banner presenta el producto y el catálogo', async () => {
    renderLanding([{ path: /featured=true/, body: emptyPage }, ...routes.slice(1)])

    expect(await screen.findByRole('heading', { level: 1, name: 'Aprende en Aula Abierta' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Explorar cursos' })[0]).toBeInTheDocument()
  })

  it('las cifras son solo las públicas: cursos y áreas', async () => {
    renderLanding()

    const stats = await screen.findByRole('region', { name: 'El catálogo en cifras' })
    expect(within(stats).getByText('5')).toBeInTheDocument()
    expect(within(stats).getByText('cursos publicados')).toBeInTheDocument()
    expect(within(stats).getByText('2')).toBeInTheDocument()
    expect(within(stats).getByText('áreas')).toBeInTheDocument()
    expect(screen.queryByText(/estudiantes|docentes|valoración/i)).not.toBeInTheDocument()
  })

  it('cada área lleva al catálogo filtrado', async () => {
    const user = userEvent.setup()
    renderLanding()

    const areas = await screen.findByRole('navigation', { name: 'Áreas' })
    await user.click(within(areas).getByRole('link', { name: /Programación/ }))
    expect(screen.getByTestId('location')).toHaveTextContent('/cursos?category=programacion')
  })

  it('una fila por área, con sus cursos y el enlace a todos', async () => {
    renderLanding()

    const row = await screen.findByRole('region', { name: 'Programación' })
    expect(await within(row).findByRole('link', { name: 'Python básico' })).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: 'Ver todos los cursos de Programación' })).toHaveAttribute('href', '/cursos?category=programacion')
  })

  it('la búsqueda lleva al catálogo con el texto', async () => {
    const user = userEvent.setup()
    renderLanding()

    await user.type(await screen.findByRole('searchbox', { name: 'Buscar cursos' }), 'rentas')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/cursos?q=rentas')
  })

  it('sin sesión ofrece iniciarla', async () => {
    renderLanding()

    expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('un catálogo vacío no deja la página en blanco', async () => {
    renderLanding([{ path: '/lms/public/catalog/courses', body: { ...emptyPage, facets: { categories: [], prerequisiteKnowledge: [] } } }])

    expect(await screen.findByText('Todavía no hay cursos publicados.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'El catálogo en cifras' })).not.toBeInTheDocument()
  })

  it('si el catálogo no responde, lo dice y deja reintentar', async () => {
    renderLanding([{ path: '/lms/public/catalog/courses', status: 503, body: problem(503, 'caído') }])

    expect(await screen.findByRole('button', { name: 'Reintentar' }, { timeout: 5000 })).toBeInTheDocument()
  })
})
