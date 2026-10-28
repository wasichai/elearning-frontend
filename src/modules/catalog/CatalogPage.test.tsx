import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes, useLocation, useParams } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { CatalogPage } from './CatalogPage'
import { catalogModule } from './module'
import { coursePage, courseSummary, emptyPage, problem } from './test/fixtures'

const COURSES = '/lms/public/catalog/courses'
let fetchMock: FetchMock

afterEach(() => fetchMock?.restore())

function Location() {
  const location = useLocation()
  return <span data-testid="location">{location.pathname + location.search}</span>
}

function CourseProbe() {
  return <p>ficha de {useParams().slug}</p>
}

function renderCatalog(routes: MockRoute[], route = '/cursos') {
  fetchMock = mockFetch(routes)
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/cursos" element={<CatalogPage />} />
        <Route path="/cursos/:slug" element={<CourseProbe />} />
      </Routes>
      <Location />
    </>,
    { modules: [catalogModule()], config: { appName: 'Aula Abierta' }, route, user: null, permissions: null }
  )
}

// los parámetros de la última petición a la API
function lastQuery(): Record<string, string> {
  const call = fetchMock.calls.at(-1)!
  return Object.fromEntries(new URL(call.url, 'http://localhost').searchParams)
}

describe('CatalogPage', () => {
  it('lista los cursos como una lista editorial', async () => {
    renderCatalog([{ path: COURSES, body: coursePage }])

    const list = await screen.findByRole('list')
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(screen.getByRole('status')).toHaveTextContent('2 cursos')

    const first = within(items[0]!)
    expect(first.getByRole('heading', { level: 3, name: courseSummary.title })).toBeInTheDocument()
    expect(first.getByRole('link', { name: courseSummary.title })).toHaveAttribute('href', '/cursos/srtm-anuncios')
    expect(first.getByText(courseSummary.summary)).toBeInTheDocument()
    expect(first.getByText('Gestión municipal')).toBeInTheDocument()
    expect(first.getByText('Inicial')).toBeInTheDocument()
    expect(first.getByText('Asíncrona')).toBeInTheDocument()
    expect(first.getByText('4 semanas · 48 h')).toBeInTheDocument()
    expect(first.getByText(/9 nov.*4 dic.*2026/)).toBeInTheDocument()
    expect(first.getByText('Inscripción abierta')).toBeInTheDocument()
    expect(first.getByText('Contenido ilustrativo')).toBeInTheDocument()

    const second = within(items[1]!)
    expect(second.getByText('Sin ediciones programadas por ahora')).toBeInTheDocument()
    expect(second.queryByText('Contenido ilustrativo')).not.toBeInTheDocument()
    expect(second.getByText('6 semanas · 72 h')).toBeInTheDocument()
  })

  it('pinta la carga mientras llega la primera respuesta', async () => {
    renderCatalog([{ path: COURSES, body: coursePage }])

    expect(screen.getByRole('status')).toHaveTextContent('Cargando cursos…')
    expect(await screen.findByRole('list')).toBeInTheDocument()
  })

  it('buscar cambia la petición y la URL, y vuelve a la primera página', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, body: coursePage }], '/cursos?page=2')
    await screen.findByRole('list')
    expect(lastQuery().page).toBe('1')

    await user.type(screen.getByRole('searchbox', { name: 'Buscar cursos' }), '  anuncios {Enter}')

    await waitFor(() => expect(lastQuery()).toMatchObject({ q: 'anuncios', page: '0', size: '12' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/cursos?q=anuncios')
  })

  it('elige un nivel con el teclado y la petición lo lleva', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, body: coursePage }])
    await screen.findByRole('list')

    const level = screen.getByRole('combobox', { name: 'Nivel' })
    expect(level).toHaveTextContent('Todas')
    level.focus()
    await user.keyboard('{Enter}')
    await user.click(await screen.findByRole('option', { name: 'Avanzado' }))

    await waitFor(() => expect(lastQuery()).toMatchObject({ level: 'AVANZADO' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/cursos?level=AVANZADO')
    expect(screen.getByRole('combobox', { name: 'Nivel' })).toHaveTextContent('Avanzado')
  })

  it('las categorías salen de los facets, con su recuento', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, body: coursePage }], '/cursos?category=programacion&sort=title')
    await screen.findByRole('list')

    expect(lastQuery()).toMatchObject({ category: 'programacion', sort: 'title' })
    const category = screen.getByRole('combobox', { name: 'Categoría' })
    expect(category).toHaveTextContent('Programación (1)')
    expect(screen.getByRole('combobox', { name: 'Ordenar por' })).toHaveTextContent('Título')

    await user.click(category)
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Todas', 'Gestión municipal (2)', 'Programación (1)'])
  })

  it('«empieza desde» filtra por fecha', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, body: coursePage }])
    await screen.findByRole('list')

    await user.type(screen.getByLabelText('Empieza desde'), '2026-11-01')

    await waitFor(() => expect(lastQuery()).toMatchObject({ startsFrom: '2026-11-01' }))
  })

  it('pasa de página con la paginación y la URL lo recuerda', async () => {
    const user = userEvent.setup()
    renderCatalog([
      { path: /page=1&/, body: { ...coursePage, page: 1, totalElements: 30, totalPages: 3 } },
      { path: COURSES, body: { ...coursePage, totalElements: 30, totalPages: 3 } }
    ])
    await screen.findByRole('list')

    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))

    await waitFor(() => expect(lastQuery().page).toBe('1'))
    expect(screen.getByTestId('location')).toHaveTextContent('/cursos?page=2')
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Resultados' })).toHaveFocus())
  })

  it('sin resultados con filtros ofrece limpiarlos', async () => {
    const user = userEvent.setup()
    renderCatalog(
      [
        { path: /level=AVANZADO/, body: emptyPage },
        { path: COURSES, body: coursePage }
      ],
      '/cursos?level=AVANZADO&q=nada'
    )

    expect(await screen.findByText('Ningún curso coincide con la búsqueda')).toBeInTheDocument()
    const clear = screen.getAllByRole('button', { name: 'Limpiar filtros' })
    await user.click(clear.at(-1)!)

    expect(await screen.findByRole('list')).toBeInTheDocument()
    expect(lastQuery()).toEqual({ sort: 'upcoming', page: '0', size: '12' })
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/cursos$/)
    expect(screen.getByRole('searchbox', { name: 'Buscar cursos' })).toHaveValue('')
  })

  it('sin cursos publicados lo dice, sin acción de limpiar', async () => {
    renderCatalog([{ path: COURSES, body: emptyPage }])

    expect(await screen.findByText('Todavía no hay cursos publicados')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  })

  it('un 400 explica qué filtro rechazó el servidor y permite empezar de nuevo', async () => {
    const user = userEvent.setup()
    renderCatalog(
      [
        { path: /level=EXPERTO/, status: 400, body: problem(400, 'Parámetros inválidos', [{ field: 'level', message: 'valor desconocido' }]) },
        { path: COURSES, body: coursePage }
      ],
      '/cursos?level=EXPERTO'
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Algún filtro de la búsqueda no es válido')
    expect(within(alert).getByRole('listitem')).toHaveTextContent('Nivel: valor desconocido')
    expect(within(alert).queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()

    await user.click(within(alert).getByRole('button', { name: 'Limpiar filtros' }))

    expect(await screen.findByRole('list')).toBeInTheDocument()
  })

  it('un 500 se explica y se puede reintentar', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, status: 500, body: problem(500, 'NullPointerException en CatalogService') }])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar el catálogo')
    expect(alert).toHaveTextContent('error 500')
    // el detalle técnico del servidor no se le enseña al público
    expect(alert).not.toHaveTextContent('NullPointerException')

    fetchMock.restore()
    fetchMock = mockFetch([{ path: COURSES, body: coursePage }])
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('list')).toBeInTheDocument()
  })

  it('una respuesta fuera de contrato no pinta datos a medias', async () => {
    renderCatalog([{ path: COURSES, body: { ...coursePage, content: [{ ...courseSummary, level: 'EXPERTO' }] } }])

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos leer la respuesta del servidor')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('se recorre con el teclado: búsqueda, filtros y enlace a la ficha', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, body: coursePage }])
    await screen.findByRole('list')

    await user.tab()
    expect(screen.getByRole('link', { name: 'Aula Abierta' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('searchbox', { name: 'Buscar cursos' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Buscar' })).toHaveFocus()
    for (const name of ['Categoría', 'Nivel', 'Modalidad']) {
      await user.tab()
      expect(screen.getByRole('combobox', { name })).toHaveFocus()
    }
    await user.tab()
    expect(screen.getByLabelText('Empieza desde')).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('combobox', { name: 'Ordenar por' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: courseSummary.title })).toHaveFocus()

    await user.keyboard('{Enter}')

    expect(await screen.findByText('ficha de srtm-anuncios')).toBeInTheDocument()
  })
})
