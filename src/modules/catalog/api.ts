import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ApiError, useApiClient, type ApiClient } from '@wasichai/core'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { coursePageSchema, courseDetailSchema, parseContract, type CourseDetail, type CoursePage, type Sort } from './contract'

// rutas de la API pública, relativas a apiBaseUrl (el cliente de @wasichai/core las completa)
const COURSES_PATH = '/lms/public/catalog/courses'
export const PAGE_SIZE = 12
export const DEFAULT_SORT: Sort = 'upcoming'

// los filtros del catálogo tal como viven en la URL. los valores se pasan tal cual al servidor:
// una URL editada a mano con un nivel que no existe recibe el 400 del backend, que es quien valida.
export interface CatalogFilters {
  q: string
  category: string
  level: string
  modality: string
  startsFrom: string
  sort: string
  // 1 = primera página; la API cuenta desde 0
  page: number
}

const FILTER_KEYS = ['q', 'category', 'level', 'modality', 'startsFrom', 'sort'] as const

export function filtersFromSearch(params: URLSearchParams): CatalogFilters {
  const page = Number(params.get('page'))
  return {
    q: params.get('q')?.trim() ?? '',
    category: params.get('category') ?? '',
    level: params.get('level') ?? '',
    modality: params.get('modality') ?? '',
    startsFrom: params.get('startsFrom') ?? '',
    sort: params.get('sort') ?? DEFAULT_SORT,
    page: Number.isInteger(page) && page > 1 ? page : 1
  }
}

// la URL corta: sin vacíos, sin el orden por defecto ni la página 1
export function filtersToSearch(filters: CatalogFilters): Record<string, string> {
  const search: Record<string, string> = {}
  for (const key of FILTER_KEYS) {
    const value = filters[key]
    if (value !== '' && !(key === 'sort' && value === DEFAULT_SORT)) search[key] = value
  }
  if (filters.page > 1) search.page = String(filters.page)
  return search
}

export function hasActiveFilters(filters: CatalogFilters): boolean {
  return FILTER_KEYS.some((key) => key !== 'sort' && filters[key] !== '')
}

export function coursesPath(filters: CatalogFilters): string {
  const params = new URLSearchParams()
  for (const key of FILTER_KEYS) if (filters[key] !== '') params.set(key, filters[key])
  params.set('page', String(filters.page - 1))
  params.set('size', String(PAGE_SIZE))
  return `${COURSES_PATH}?${params}`
}

export function coursePath(slug: string): string {
  return `${COURSES_PATH}/${encodeURIComponent(slug)}`
}

export async function fetchCourses(client: ApiClient, filters: CatalogFilters, signal?: AbortSignal): Promise<CoursePage> {
  const body = await client.request<unknown>(coursesPath(filters), { signal })
  return parseContract(coursePageSchema, 'GET courses', body)
}

export async function fetchCourse(client: ApiClient, slug: string, signal?: AbortSignal): Promise<CourseDetail> {
  const body = await client.request<unknown>(coursePath(slug), { signal })
  return parseContract(courseDetailSchema, `GET courses/${slug}`, body)
}

// solo se reintenta lo que pudo ser la red (fetch lanza TypeError). un 4xx, un 5xx o un contrato roto se muestran
// enseguida, con su botón de reintentar: repetirlos solos no arregla nada y retrasa el mensaje
export function retryNetwork(failures: number, error: unknown): boolean {
  return failures < 2 && !(error instanceof ApiError) && error instanceof TypeError
}

export const catalogKeys = {
  all: ['catalog'] as const,
  courses: (filters: CatalogFilters) => ['catalog', 'courses', filters] as const,
  course: (slug: string) => ['catalog', 'course', slug] as const
}

export function useCourses(filters: CatalogFilters) {
  const client = useApiClient()
  return useQuery({
    queryKey: catalogKeys.courses(filters),
    queryFn: ({ signal }) => fetchCourses(client, filters, signal),
    // al cambiar de filtro o página se queda la lista anterior a la vista (atenuada) en vez de un parpadeo de carga
    placeholderData: keepPreviousData,
    retry: retryNetwork
  })
}

export function useCourse(slug: string) {
  const client = useApiClient()
  return useQuery({
    queryKey: catalogKeys.course(slug),
    queryFn: ({ signal }) => fetchCourse(client, slug, signal),
    retry: retryNetwork
  })
}

// los filtros en la URL (el router de WasichaiApp): se comparten con el enlace y el botón atrás los deshace.
// cambiar cualquier filtro vuelve a la página 1; cambiar solo la página la conserva.
export function useCatalogFilters(): [CatalogFilters, (patch: Partial<CatalogFilters>) => void, () => void] {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => filtersFromSearch(params), [params])
  const update = useCallback(
    (patch: Partial<CatalogFilters>) => {
      const onlyPage = Object.keys(patch).every((key) => key === 'page')
      const next = { ...filters, ...patch, page: onlyPage ? (patch.page ?? filters.page) : 1 }
      setParams(filtersToSearch(next))
    },
    [filters, setParams]
  )
  const clear = useCallback(() => setParams(filtersToSearch({ ...filtersFromSearch(new URLSearchParams()), sort: filters.sort })), [filters.sort, setParams])
  return [filters, update, clear]
}
