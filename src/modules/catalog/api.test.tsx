import { createApiClient } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { coursesPath, fetchCourse, fetchCourses, filtersFromSearch, filtersToSearch, useCatalogFilters, useCourses } from './api'
import { ContractError } from './contract'
import { catalogModule } from './module'
import { courseDetail, coursePage } from './test/fixtures'

const COURSES = '/lms/public/catalog/courses'
let fetchMock: FetchMock | undefined

afterEach(() => fetchMock?.restore())

const client = () => createApiClient({ baseUrl: '/api', storagePrefix: 'catalog-test' })
const noFilters = filtersFromSearch(new URLSearchParams())

describe('filtros en la URL', () => {
  it('lee la URL con valores por defecto', () => {
    expect(noFilters).toEqual({
      q: '',
      category: '',
      level: '',
      modality: '',
      startsFrom: '',
      minWeeks: '',
      maxWeeks: '',
      enrollmentOpen: '',
      minTheoryHours: '',
      minPracticeHours: '',
      minAutonomousHours: '',
      sort: 'upcoming',
      page: 1
    })
    expect(filtersFromSearch(new URLSearchParams('q=+anuncios+&page=3&sort=title')).page).toBe(3)
    expect(filtersFromSearch(new URLSearchParams('page=-2')).page).toBe(1)
  })

  it('escribe una URL corta y la relee igual', () => {
    const filters = { ...noFilters, q: 'anuncios', level: 'INICIAL', page: 2 }

    expect(filtersToSearch(noFilters)).toEqual({})
    expect(filtersToSearch(filters)).toEqual({ q: 'anuncios', level: 'INICIAL', page: '2' })
    expect(filtersFromSearch(new URLSearchParams(filtersToSearch(filters)))).toEqual(filters)
  })
})

describe('peticiones', () => {
  it('la URL de la petición lleva los filtros, la página desde 0 y el tamaño', () => {
    const path = coursesPath({
      ...noFilters,
      q: 'anuncios',
      category: 'gestion-municipal',
      level: 'AVANZADO',
      modality: 'SINCRONA',
      startsFrom: '2026-11-01',
      minWeeks: '12',
      enrollmentOpen: 'true',
      minPracticeHours: '6.5',
      page: 2
    })
    const [base, query] = path.split('?')

    expect(base).toBe(COURSES)
    expect(Object.fromEntries(new URLSearchParams(query))).toEqual({
      q: 'anuncios',
      category: 'gestion-municipal',
      level: 'AVANZADO',
      modality: 'SINCRONA',
      startsFrom: '2026-11-01',
      minWeeks: '12',
      enrollmentOpen: 'true',
      minPracticeHours: '6.5',
      sort: 'upcoming',
      page: '1',
      size: '12'
    })
  })

  it('lista cursos y valida la respuesta', async () => {
    fetchMock = mockFetch([{ path: COURSES, body: coursePage }])

    const page = await fetchCourses(client(), noFilters)

    expect(page.totalElements).toBe(2)
    expect(fetchMock.calls[0]?.url).toBe(`/api${COURSES}?sort=upcoming&page=0&size=12`)
  })

  it('una respuesta fuera de contrato es un ContractError, no datos a medias', async () => {
    fetchMock = mockFetch([{ path: COURSES, body: { ...coursePage, content: 'nada' } }])

    await expect(fetchCourses(client(), noFilters)).rejects.toBeInstanceOf(ContractError)
  })

  it('pide la ficha por slug codificado', async () => {
    fetchMock = mockFetch([{ path: /^\/lms\/public\/catalog\/courses\/a%2Fb$/, body: courseDetail }])

    await fetchCourse(client(), 'a/b')

    expect(fetchMock.calls[0]?.path).toBe(`${COURSES}/a%2Fb`)
  })
})

function Probe() {
  const [filters] = useCatalogFilters()
  const query = useCourses(filters)
  return <p>{query.data ? `total ${query.data.totalElements}` : 'cargando'}</p>
}

describe('useCourses con useCatalogFilters', () => {
  it('pide lo que dice la URL de la página', async () => {
    fetchMock = mockFetch([{ path: COURSES, body: coursePage }])

    renderWithProviders(<Probe />, { modules: [catalogModule()], user: null, permissions: null, route: '/cursos?level=AVANZADO&q=srtm&page=2' })

    expect(await screen.findByText('total 2')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock?.calls).toHaveLength(1))
    expect(Object.fromEntries(new URL(fetchMock.calls[0]!.url, 'http://x').searchParams)).toEqual({
      q: 'srtm',
      level: 'AVANZADO',
      sort: 'upcoming',
      page: '1',
      size: '12'
    })
  })
})
