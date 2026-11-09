import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes, useLocation, useParams } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { CatalogPage } from './CatalogPage'
import { catalogModule } from './module'
import { coursePage, courseSummary, courseWithoutOffering, emptyPage, problem } from './test/fixtures'
import { learningGroup } from './test/learningGroup'

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
    { modules: [catalogModule(), learningGroup], config: { appName: 'Aula Abierta' }, route, user: null, permissions: null }
  )
}

// los parámetros de la última petición a la API
function lastQuery(): Record<string, string> {
  const call = fetchMock.calls.at(-1)!
  return Object.fromEntries(new URL(call.url, 'http://localhost').searchParams)
}

// los filtros de segunda línea están plegados: como quien los usa, primero se abre «Más filtros»
async function openMoreFilters(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText('Más filtros'))
}

function mockViewport(wide: boolean) {
  const original = window.matchMedia
  window.matchMedia = ((query: string) => ({
    matches: wide,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {}
  })) as unknown as typeof window.matchMedia
  return () => {
    window.matchMedia = original
  }
}

describe('CatalogPage', () => {
  it('un curso sin resumen no deja un párrafo vacío ni «null»', async () => {
    renderCatalog([{ path: '/lms/public/catalog/courses', body: { ...coursePage, content: [{ ...courseSummary, summary: null }] } }])

    expect(await screen.findByRole('link', { name: courseSummary.title })).toBeInTheDocument()
    expect(screen.queryByText(/null|undefined/)).not.toBeInTheDocument()
  })

  it('results render as list rows with enrollment status', async () => {
    renderCatalog([{ path: COURSES, body: coursePage }])

    const list = await screen.findByRole('list')
    expect(list.tagName).toBe('UL')
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(screen.getByRole('status')).toHaveTextContent('2 cursos')

    const first = within(items[0]!)
    // el título es el enlace principal y el único interactivo de la fila: sin fila entera clicable
    expect(first.getByRole('heading', { level: 4, name: courseSummary.title })).toBeInTheDocument()
    expect(first.getByRole('link', { name: courseSummary.title })).toHaveAttribute('href', '/cursos/srtm-anuncios')
    expect(first.getAllByRole('link')).toHaveLength(1)
    expect(first.queryByRole('button')).not.toBeInTheDocument()
    expect(items[0]!.querySelector('a[class*="after:"]')).toBeNull()
    expect(first.getByText(courseSummary.summary)).toBeInTheDocument()
    // la colección va en el encabezado de su grupo, no en la fila
    expect(first.queryByText('Gestión municipal')).not.toBeInTheDocument()
    expect(within(list).getByRole('heading', { level: 3, name: 'Gestión municipal' })).toBeInTheDocument()
    expect(first.getByText('Inicial')).toBeInTheDocument()
    expect(first.getByText('Asíncrona')).toBeInTheDocument()
    expect(first.getByText('4 semanas · 48 h')).toBeInTheDocument()
    // los hechos con su nombre para el lector de pantalla
    for (const label of ['Nivel', 'Modalidad', 'Duración']) expect(first.getByText(label)).toHaveClass('sr-only')
    // la próxima edición y la inscripción, en insignia con icono y palabra
    expect(first.getByText('Próxima edición')).toBeInTheDocument()
    expect(first.getByText(/9 nov.*4 dic.*2026/)).toBeInTheDocument()
    const badge = first.getByText('Inscripción abierta').closest('[data-state]')!
    expect(badge).toHaveAttribute('data-state', 'active')
    expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(first.getByText('Inscripción abierta')).toHaveClass('text-secondary')
    expect(items.every((item) => item.querySelector('[data-slot="cord-banner"]') === null)).toBe(true)

    const second = within(items[1]!)
    expect(second.getByText('Sin ediciones programadas por ahora')).toBeInTheDocument()
    expect(second.getByText('6 semanas · 72 h')).toBeInTheDocument()
    expect(second.queryByText('Próxima edición')).not.toBeInTheDocument()
  })

  describe('agrupado por colección', () => {
    const inCategory = (slug: string, name: string, course: string) => ({ ...courseSummary, slug: course, title: course, category: { slug, name } })
    const headings = () => screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
    const rowTitles = () => screen.getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent)

    it('las filas consecutivas de una colección van bajo un encabezado con su recuento, en el orden del servidor', async () => {
      const content = [
        inCategory('a', 'Colección A', 'A1'),
        inCategory('a', 'Colección A', 'A2'),
        inCategory('b', 'Colección B', 'B1'),
        // reaparece más abajo: el encabezado se repite y las filas no se reordenan
        inCategory('a', 'Colección A', 'A3')
      ]
      renderCatalog([{ path: COURSES, body: { ...coursePage, content, totalElements: 4 } }])
      await screen.findByRole('list')

      expect(headings()).toEqual(['Colección A', 'Colección B', 'Colección A'])
      expect(rowTitles()).toEqual(['A1', 'A2', 'B1', 'A3'])
      // una sola lista: el encabezado no parte las filas
      expect(screen.getAllByRole('list')).toHaveLength(1)
      expect(screen.getAllByRole('listitem')).toHaveLength(4)
      expect(screen.getAllByText(/^[1-9] cursos?$/).map((count) => count.textContent)).toEqual(['4 cursos', '2 cursos', '1 curso', '1 curso'])
    })

    it('con una categoría elegida no hay encabezados y la fila conserva su meta de colección', async () => {
      const content = [inCategory('a', 'Colección A', 'A1'), inCategory('a', 'Colección A', 'A2')]
      renderCatalog([{ path: COURSES, body: { ...coursePage, content, totalElements: 2 } }], '/cursos?category=a')
      await screen.findByRole('list')

      expect(screen.queryAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['A1', 'A2'])
      expect(screen.queryAllByRole('heading', { level: 4 })).toEqual([])
      expect(screen.getAllByText('Colección A', { selector: 'p' })).toHaveLength(2)
    })

    it('un curso sin colección no lleva encabezado', async () => {
      const content = [{ ...courseWithoutOffering }, inCategory('a', 'Colección A', 'A1')]
      renderCatalog([{ path: COURSES, body: { ...coursePage, content, totalElements: 2 } }])
      await screen.findByRole('list')

      expect(headings()).toEqual(['Colección A'])
      expect(rowTitles()).toEqual([courseWithoutOffering.title, 'A1'])
    })
  })

  it('illustrative notice appears once', async () => {
    const illustrative = [
      { ...courseSummary, slug: 'a', title: 'Curso A' },
      { ...courseSummary, slug: 'b', title: 'Curso B' }
    ]
    renderCatalog([{ path: COURSES, body: { ...coursePage, content: illustrative } }])
    await screen.findByRole('list')

    // una vez, en el encabezado, y no en cada fila
    const notices = screen.getAllByText('Contenido ilustrativo')
    expect(notices).toHaveLength(1)
    expect(within(screen.getByRole('list')).queryByText('Contenido ilustrativo')).not.toBeInTheDocument()
  })

  it('in a mixed page each illustrative row carries its own mark and the header none', async () => {
    renderCatalog([{ path: COURSES, body: coursePage }])
    const items = within(await screen.findByRole('list')).getAllByRole('listitem')

    // solo el primero es ilustrativo: su marca va en su fila y el encabezado no dice nada
    expect(screen.getAllByText('Contenido ilustrativo')).toHaveLength(1)
    expect(within(items[0]!).getByText('Contenido ilustrativo')).toBeInTheDocument()
    expect(within(items[1]!).queryByText('Contenido ilustrativo')).not.toBeInTheDocument()
  })

  it('the illustrative mark is 14 px', async () => {
    renderCatalog([{ path: COURSES, body: coursePage }])
    await screen.findByRole('list')

    expect(screen.getByText('Contenido ilustrativo').closest('span')).toHaveClass('text-secondary')
  })

  it('long title is clamped with full title available', async () => {
    const title = `Agentes de IA con trazabilidad y revisión humana para procesos públicos ${'y servicios '.repeat(8)}`.trim()
    expect(title.length).toBeGreaterThan(90)
    renderCatalog([{ path: COURSES, body: { ...coursePage, content: [{ ...courseSummary, title }] } }])

    const link = await screen.findByRole('link', { name: title })
    expect(link).toHaveAttribute('title', title)
    // en táctil no hay title: el resumen describe el enlace
    expect(link).toHaveAccessibleDescription(courseSummary.summary)
    expect(link).toHaveClass('line-clamp-2')
    expect(link.closest('li')).toHaveClass('min-w-0')
  })

  it('la región de resultados lleva su título visible y el recuento', async () => {
    renderCatalog([{ path: COURSES, body: coursePage }])

    const region = await screen.findByRole('region', { name: 'Resultados' })
    await within(region).findByRole('list')
    expect(within(region).getByRole('heading', { level: 2, name: 'Resultados' })).not.toHaveClass('sr-only')
    expect(within(region).getByRole('status')).toHaveTextContent('2 cursos')
  })

  // RF-CAT-09: la fila distingue la edición completa de la cerrada
  it.each([
    ['FULL', 'Edición completa'],
    ['CLOSED', 'Inscripción cerrada']
  ])('la próxima edición %s se anuncia como «%s»', async (enrollmentStatus, label) => {
    const nextOffering = { ...courseSummary.nextOffering, enrollmentOpen: false, enrollmentStatus }
    renderCatalog([{ path: COURSES, body: { ...coursePage, content: [{ ...courseSummary, nextOffering }] } }])

    const item = within(within(await screen.findByRole('list')).getAllByRole('listitem')[0]!)
    expect(item.getByText(label)).toBeInTheDocument()
    expect(item.queryByText('Inscripción abierta')).not.toBeInTheDocument()
  })

  it('pinta la carga mientras llega la primera respuesta', async () => {
    renderCatalog([{ path: COURSES, body: coursePage }])

    expect(screen.getByRole('status')).toHaveTextContent('Cargando cursos…')
    // el hueco de las filas, con su geometría, y todavía ninguna lista que anunciar
    expect(document.querySelectorAll('[data-slot="course-row-skeleton"]').length).toBeGreaterThan(0)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(await screen.findByRole('list')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="course-row-skeleton"]')).toBeNull()
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
    await openMoreFilters(user)

    const level = screen.getByRole('combobox', { name: 'Nivel' })
    expect(level).toHaveTextContent('Cualquiera')
    level.focus()
    await user.keyboard('{Enter}')
    await user.click(await screen.findByRole('option', { name: 'Avanzado' }))

    await waitFor(() => expect(lastQuery()).toMatchObject({ level: 'AVANZADO' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/cursos?level=AVANZADO')
    expect(screen.getByRole('combobox', { name: 'Nivel' })).toHaveTextContent('Avanzado')
  })

  it('las categorías salen de los facets, con su recuento, como botones que se pulsan', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, body: coursePage }], '/cursos?category=programacion&sort=title')
    await screen.findByRole('list')

    expect(lastQuery()).toMatchObject({ category: 'programacion', sort: 'title' })
    const group = within(screen.getByRole('group', { name: 'Categoría' }))
    expect(group.getAllByRole('button').map((chip) => chip.textContent)).toEqual(['Todas', 'Gestión municipal (2)', 'Programación (1)'])
    expect(group.getByRole('button', { name: 'Programación (1)' })).toHaveAttribute('aria-pressed', 'true')
    expect(group.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(group.getByRole('button', { name: 'Gestión municipal (2)' }))
    await waitFor(() => expect(lastQuery()).toMatchObject({ category: 'gestion-municipal', sort: 'title' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/cursos?category=gestion-municipal&sort=title')
    expect(group.getByRole('button', { name: 'Gestión municipal (2)' })).toHaveAttribute('aria-pressed', 'true')
    expect(group.getByRole('button', { name: 'Programación (1)' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(group.getByRole('button', { name: 'Todas' }))
    await waitFor(() => expect(lastQuery().category).toBeUndefined())
    expect(group.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('pulsar la categoría elegida la quita, y una de la URL sin cursos se ve tal cual', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, body: coursePage }], '/cursos?category=astronomia')
    await screen.findByRole('list')

    const chip = within(screen.getByRole('group', { name: 'Categoría' })).getByRole('button', { name: 'astronomia' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')

    await user.click(chip)
    await waitFor(() => expect(lastQuery().category).toBeUndefined())
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/cursos$/)
  })

  it('«Más filtros» guarda todos los demás filtros y cuenta los activos', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, body: coursePage }], '/cursos?q=srtm&category=programacion&level=INICIAL&minWeeks=4&maxWeeks=6&sort=title')
    await screen.findByRole('list')

    // la búsqueda y la categoría ya están a la vista; el rango de semanas es un solo filtro
    expect(screen.getByText('3 activos')).toBeInTheDocument()

    await openMoreFilters(user)
    for (const name of ['Nivel', 'Modalidad', 'Duración', 'Inscripción', 'Conocimientos previos', 'Ordenar por']) {
      expect(screen.getByRole('combobox', { name })).toBeInTheDocument()
    }
    for (const label of ['Empieza desde', 'Horas de teoría (mínimo)', 'Horas de práctica o laboratorio (mínimo)', 'Horas de trabajo autónomo (mínimo)']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.getByRole('combobox', { name: 'Ordenar por' })).toHaveTextContent('Título')
  })

  it('sin filtros activos, «Más filtros» no lleva contador ni hay nada que limpiar', async () => {
    renderCatalog([{ path: COURSES, body: coursePage }])
    await screen.findByRole('list')

    expect(screen.queryByText(/activos?$/)).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Filtros activos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  })

  it('cada filtro activo se ve con su nombre y su valor legibles', async () => {
    renderCatalog(
      [{ path: COURSES, body: coursePage }],
      '/cursos?q=srtm&category=programacion&level=INICIAL&modality=HIBRIDA&startsFrom=2026-11-01&minWeeks=12&enrollmentOpen=true&minTheoryHours=10&prerequisiteKnowledge=none&sort=title'
    )
    await screen.findByRole('list')

    const chips = within(screen.getByRole('group', { name: 'Filtros activos' })).getAllByRole('button')
    expect(chips.map((chip) => chip.textContent)).toEqual([
      'Búsqueda: srtm',
      'Categoría: Programación',
      'Nivel: Inicial',
      'Modalidad: Híbrida',
      'Empieza desde: 1 nov 2026',
      'Duración: Semestral (12 a 26 semanas)',
      'Con inscripción abierta',
      'Sin conocimientos previos',
      'Horas de teoría (mínimo): 10',
      'Ordenar por: Título',
      'Limpiar filtros'
    ])
  })

  it('un valor de la URL que no se reconoce se ve tal cual, sin romper la página', async () => {
    renderCatalog(
      [{ path: COURSES, body: coursePage }],
      '/cursos?level=EXPERTO&startsFrom=ayer&prerequisiteKnowledge=astronomia&enrollmentOpen=quiza&minWeeks=4&maxWeeks=6'
    )
    await screen.findByRole('list')

    const group = within(screen.getByRole('group', { name: 'Filtros activos' }))
    for (const text of ['Nivel: EXPERTO', 'Empieza desde: ayer', 'Conocimientos previos: astronomia', 'Inscripción: quiza', 'Duración: De 4 a 6 semanas']) {
      expect(group.getByRole('button', { name: `Quitar filtro ${text}` })).toBeInTheDocument()
    }
  })

  it('un filtro activo se quita solo, sin tocar los demás, y el foco pasa a los resultados', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, body: coursePage }], '/cursos?level=INICIAL&minWeeks=4&maxWeeks=6&sort=title&page=2')
    await screen.findByRole('list')

    await user.click(screen.getByRole('button', { name: 'Quitar filtro Duración: De 4 a 6 semanas' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/cursos\?level=INICIAL&sort=title$/))
    await waitFor(() => expect(lastQuery()).toEqual({ level: 'INICIAL', sort: 'title', page: '0', size: '12' }))
    expect(screen.getByRole('heading', { name: 'Resultados' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Quitar filtro Ordenar por: Título' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/cursos\?level=INICIAL$/))

    await user.click(screen.getByRole('button', { name: 'Quitar filtro Nivel: Inicial' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/cursos$/))
    expect(screen.queryByRole('group', { name: 'Filtros activos' })).not.toBeInTheDocument()
  })

  it('«Limpiar filtros» los quita todos y deja el foco en los resultados, no en la nada', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, body: coursePage }], '/cursos?level=INICIAL&q=srtm')
    await screen.findByRole('list')

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/cursos$/))
    expect(screen.getByRole('heading', { name: 'Resultados' })).toHaveFocus()
  })

  describe('en un móvil', () => {
    let restore: () => void
    afterEach(() => restore())

    it('«Más filtros» abre una hoja con los mismos controles, sin duplicarlos, y cierra enseñando cuántos cursos hay', async () => {
      restore = mockViewport(false)
      const user = userEvent.setup()
      renderCatalog([{ path: COURSES, body: coursePage }], '/cursos?level=INICIAL')
      await screen.findByRole('list')

      expect(document.querySelector('details')).toBeNull()
      expect(screen.queryByRole('combobox', { name: 'Nivel' })).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Más filtros 1 activo' }))

      const sheet = within(await screen.findByRole('dialog', { name: 'Más filtros' }))
      expect(screen.getAllByRole('combobox', { name: 'Nivel' })).toHaveLength(1)
      expect(sheet.getByRole('combobox', { name: 'Nivel' })).toHaveTextContent('Inicial')
      expect(sheet.getByRole('combobox', { name: 'Ordenar por' })).toBeInTheDocument()

      await user.type(sheet.getByLabelText('Horas de teoría (mínimo)'), '10')
      await user.click(sheet.getByRole('button', { name: 'Ver 2 cursos' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      // salir del campo confirma: la hora escrita no se pierde al cerrar la hoja
      await waitFor(() => expect(lastQuery()).toMatchObject({ level: 'INICIAL', minTheoryHours: '10' }))
    })

    it('la hoja no promete una cifra mientras llega la respuesta', async () => {
      restore = mockViewport(false)
      const user = userEvent.setup()
      renderCatalog([{ path: COURSES, body: coursePage }], '/cursos')
      await screen.findByRole('list')
      // la respuesta con el filtro nuevo se queda en vuelo hasta que la prueba la suelta
      let release = () => {}
      const held = new Promise<void>((resolve) => (release = resolve))
      const answer = globalThis.fetch
      globalThis.fetch = async (...args) => {
        await held
        return answer(...args)
      }
      await user.click(screen.getByRole('button', { name: 'Más filtros' }))
      const sheet = within(await screen.findByRole('dialog', { name: 'Más filtros' }))

      await user.type(sheet.getByLabelText('Horas de teoría (mínimo)'), '10{Enter}')

      expect(await sheet.findByRole('button', { name: 'Ver resultados' })).toBeInTheDocument()
      release()
      expect(await sheet.findByRole('button', { name: 'Ver 2 cursos' })).toBeInTheDocument()
    })
  })

  it('«empieza desde» filtra por fecha', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, body: coursePage }])
    await screen.findByRole('list')
    await openMoreFilters(user)

    await user.type(screen.getByLabelText('Empieza desde'), '2026-11-01')

    await waitFor(() => expect(lastQuery()).toMatchObject({ startsFrom: '2026-11-01' }))
  })

  it('la duración elige un rango de semanas y lo manda como minWeeks y maxWeeks', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, body: coursePage }])
    await screen.findByRole('list')
    await openMoreFilters(user)

    const duration = screen.getByRole('combobox', { name: 'Duración' })
    expect(duration).toHaveTextContent('Cualquiera')
    await user.click(duration)
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Cualquiera',
      'Hasta 2 semanas',
      'De 3 a 8 semanas',
      'Semestral (12 a 26 semanas)'
    ])
    await user.click(screen.getByRole('option', { name: 'Semestral (12 a 26 semanas)' }))

    await waitFor(() => expect(lastQuery()).toMatchObject({ minWeeks: '12' }))
    expect(lastQuery().maxWeeks).toBeUndefined()
    expect(screen.getByTestId('location')).toHaveTextContent('/cursos?minWeeks=12')

    await user.click(screen.getByRole('combobox', { name: 'Duración' }))
    await user.click(screen.getByRole('option', { name: 'Hasta 2 semanas' }))
    await waitFor(() => expect(lastQuery()).toMatchObject({ maxWeeks: '2' }))
    expect(lastQuery().minWeeks).toBeUndefined()
  })

  it('un rango de semanas escrito en la URL se ve tal cual en el selector', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, body: coursePage }], '/cursos?minWeeks=4&maxWeeks=6')
    await screen.findByRole('list')
    await openMoreFilters(user)

    expect(lastQuery()).toMatchObject({ minWeeks: '4', maxWeeks: '6' })
    expect(screen.getByRole('combobox', { name: 'Duración' })).toHaveTextContent('De 4 a 6 semanas')
  })

  it('la inscripción filtra los cursos con una edición abierta hoy', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, body: coursePage }])
    await screen.findByRole('list')
    await openMoreFilters(user)

    await user.click(screen.getByRole('combobox', { name: 'Inscripción' }))
    await user.click(screen.getByRole('option', { name: 'Con inscripción abierta' }))

    await waitFor(() => expect(lastQuery()).toMatchObject({ enrollmentOpen: 'true' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/cursos?enrollmentOpen=true')
  })

  it('las horas por tipo mandan el mínimo de cada una al confirmar, y no un valor inválido', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, body: coursePage }])
    await screen.findByRole('list')
    await openMoreFilters(user)
    const requests = () => fetchMock.calls.length

    const practice = screen.getByLabelText('Horas de práctica o laboratorio (mínimo)')
    const before = requests()
    await user.type(practice, '6.5')
    // una petición por tecla no: hasta confirmar no se busca
    expect(requests()).toBe(before)
    await user.keyboard('{Enter}')
    await waitFor(() => expect(lastQuery()).toMatchObject({ minPracticeHours: '6.5' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/cursos?minPracticeHours=6.5')

    const theory = screen.getByLabelText('Horas de teoría (mínimo)')
    await user.type(theory, '-3{Enter}')
    expect(lastQuery().minTheoryHours).toBeUndefined()
    await user.clear(theory)
    await user.type(theory, '10')
    // salir del campo también confirma
    await user.tab()
    await waitFor(() => expect(lastQuery()).toMatchObject({ minTheoryHours: '10', minPracticeHours: '6.5' }))

    await user.type(screen.getByLabelText('Horas de trabajo autónomo (mínimo)'), '24{Enter}')
    await waitFor(() => expect(lastQuery()).toMatchObject({ minAutonomousHours: '24' }))
  })

  // RF-CAT-08: las claves salen de la faceta, con su recuento; «sin conocimientos previos» siempre está
  it('los conocimientos previos salen de los facets y mandan la clave elegida o none', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, body: coursePage }])
    await screen.findByRole('list')
    await openMoreFilters(user)

    const knowledge = screen.getByRole('combobox', { name: 'Conocimientos previos' })
    expect(knowledge).toHaveTextContent('Cualquiera')
    await user.click(knowledge)
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Cualquiera',
      'Sin conocimientos previos',
      'Hoja de cálculo (1)',
      'Manejo de un navegador web (2)'
    ])
    await user.click(screen.getByRole('option', { name: 'Manejo de un navegador web (2)' }))
    await waitFor(() => expect(lastQuery()).toMatchObject({ prerequisiteKnowledge: 'navegador-web' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/cursos?prerequisiteKnowledge=navegador-web')

    await user.click(screen.getByRole('combobox', { name: 'Conocimientos previos' }))
    await user.click(screen.getByRole('option', { name: 'Sin conocimientos previos' }))
    await waitFor(() => expect(lastQuery()).toMatchObject({ prerequisiteKnowledge: 'none' }))
  })

  it('una clave de la URL sin cursos se ve tal cual y el estado vacío ofrece limpiarla', async () => {
    const user = userEvent.setup()
    renderCatalog(
      [
        { path: /prerequisiteKnowledge=astronomia/, body: { ...emptyPage, facets: { categories: [], prerequisiteKnowledge: [] } } },
        { path: COURSES, body: coursePage }
      ],
      '/cursos?prerequisiteKnowledge=astronomia'
    )

    expect(await screen.findByText('Ningún curso coincide con la búsqueda')).toBeInTheDocument()
    expect(lastQuery()).toMatchObject({ prerequisiteKnowledge: 'astronomia' })
    await openMoreFilters(user)
    expect(screen.getByRole('combobox', { name: 'Conocimientos previos' })).toHaveTextContent('astronomia')
    const clear = screen.getAllByRole('button', { name: 'Limpiar filtros' })
    await user.click(clear.at(-1)!)

    expect(await screen.findByRole('list')).toBeInTheDocument()
    expect(lastQuery().prerequisiteKnowledge).toBeUndefined()
    expect(screen.getByRole('combobox', { name: 'Conocimientos previos' })).toHaveTextContent('Cualquiera')
  })

  it('sin resultados por un filtro nuevo, el estado vacío ofrece limpiarlos y los campos se vacían', async () => {
    const user = userEvent.setup()
    renderCatalog(
      [
        { path: /minAutonomousHours=500/, body: emptyPage },
        { path: COURSES, body: coursePage }
      ],
      '/cursos?minAutonomousHours=500&enrollmentOpen=true&minWeeks=12'
    )

    expect(await screen.findByText('Ningún curso coincide con la búsqueda')).toBeInTheDocument()
    await openMoreFilters(user)
    expect(screen.getByLabelText('Horas de trabajo autónomo (mínimo)')).toHaveValue(500)
    expect(screen.getByRole('combobox', { name: 'Inscripción' })).toHaveTextContent('Con inscripción abierta')
    const clear = screen.getAllByRole('button', { name: 'Limpiar filtros' })
    await user.click(clear.at(-1)!)

    expect(await screen.findByRole('list')).toBeInTheDocument()
    expect(lastQuery()).toEqual({ sort: 'upcoming', page: '0', size: '12' })
    expect(screen.getByLabelText('Horas de trabajo autónomo (mínimo)')).toHaveValue(null)
    expect(screen.getByRole('combobox', { name: 'Duración' })).toHaveTextContent('Cualquiera')
    expect(screen.getByRole('combobox', { name: 'Inscripción' })).toHaveTextContent('Cualquiera')
  })

  it('un 400 de un filtro nuevo lo nombra por su rótulo', async () => {
    renderCatalog(
      [
        {
          path: /maxWeeks=1/,
          status: 400,
          body: problem(400, 'Parámetros inválidos', [{ field: 'maxWeeks', message: 'must be >= minWeeks' }])
        }
      ],
      '/cursos?minWeeks=4&maxWeeks=1'
    )

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByRole('listitem')).toHaveTextContent('Duración: must be >= minWeeks')
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
    expect(alert).toHaveTextContent('Código del error: 500')
    // el detalle técnico del servidor no se le enseña al público
    expect(alert).not.toHaveTextContent('NullPointerException')

    fetchMock.restore()
    fetchMock = mockFetch([{ path: COURSES, body: coursePage }])
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('list')).toBeInTheDocument()
  })

  it('un 403 no culpa a los filtros: el catálogo no está disponible', async () => {
    renderCatalog([{ path: COURSES, status: 403, body: problem(403, 'Access Denied') }], '/cursos?level=INICIAL')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('El catálogo no está disponible')
    expect(alert).toHaveTextContent('Código del error: 403')
    expect(within(alert).getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(within(alert).queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  })

  // el cliente de @wasichai/core cierra la sesión ante un 401 y vacía la caché con la consulta en vuelo
  it('un 401 no deja la página cargando para siempre', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, status: 401, body: problem(401, 'Full authentication is required') }])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('El catálogo no está disponible')
    expect(alert).toHaveTextContent('Código del error: 401')
    expect(screen.queryByText('Cargando cursos…')).not.toBeInTheDocument()

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

  it('se recorre con el teclado: búsqueda, categorías, más filtros y enlace a la ficha', async () => {
    const user = userEvent.setup()
    renderCatalog([{ path: COURSES, body: coursePage }])
    await screen.findByRole('list')
    await openMoreFilters(user)
    ;(document.activeElement as HTMLElement).blur()

    await user.tab()
    expect(screen.getByRole('link', { name: 'Aula Abierta' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('searchbox', { name: 'Buscar cursos' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Buscar' })).toHaveFocus()
    for (const name of ['Todas', 'Gestión municipal (2)', 'Programación (1)']) {
      await user.tab()
      expect(screen.getByRole('button', { name })).toHaveFocus()
    }
    await user.tab()
    expect(screen.getByText('Más filtros').closest('summary')).toHaveFocus()
    for (const name of ['Nivel', 'Modalidad', 'Duración']) {
      await user.tab()
      expect(screen.getByRole('combobox', { name })).toHaveFocus()
    }
    await user.tab()
    expect(screen.getByLabelText('Empieza desde')).toHaveFocus()
    for (const name of ['Inscripción', 'Conocimientos previos']) {
      await user.tab()
      expect(screen.getByRole('combobox', { name })).toHaveFocus()
    }
    for (const label of ['Horas de teoría (mínimo)', 'Horas de práctica o laboratorio (mínimo)', 'Horas de trabajo autónomo (mínimo)']) {
      await user.tab()
      expect(screen.getByLabelText(label)).toHaveFocus()
    }
    await user.tab()
    expect(screen.getByRole('combobox', { name: 'Ordenar por' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: courseSummary.title })).toHaveFocus()

    await user.keyboard('{Enter}')

    expect(await screen.findByText('ficha de srtm-anuncios')).toBeInTheDocument()
  })
})
