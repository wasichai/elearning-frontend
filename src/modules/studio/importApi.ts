import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiClient, type ApiClient } from '@wasichai/core'
import { retryNetwork } from '../../shared/retry'
import {
  courseRecordPageSchema,
  importJobSchema,
  importSourceListSchema,
  parseContract,
  type ImportJob,
  type ImportSource,
  type ImportStatus
} from './contract'

// la importación del estudio, con sesión, relativa a apiBaseUrl
const IMPORT_PATH = '/lms/studio/import'
// los cursos salen de la API de registros de Wasichai: lo que la persona puede leer, ordenado por título (200 es el
// máximo que admite una página)
const COURSE_RECORDS = '/objects/curso/records?size=200&sort=titulo'

// cada pocos segundos mientras el trabajo está en la cola
export const IMPORT_POLL_MS = 3000

export interface CourseOption {
  id: string
  code: string
  title: string
}

export interface ImportRequest {
  // owner/repo@sha:ruta/maestro.adoc
  source: string
  courseId: string
}

export const isFinished = (status: ImportStatus | undefined) => status === 'HECHO' || status === 'FALLIDO'

// una ruta relativa como la acepta el servidor (SourceRef del backend): tramos simples separados por «/», sin «.» ni «..»
const PATH_SEGMENT = /^[A-Za-z0-9._-]+$/
export const MAX_PATH = 1024

export function isValidPath(path: string): boolean {
  return path.length > 0 && path.length <= MAX_PATH && path.split('/').every((segment) => PATH_SEGMENT.test(segment) && segment !== '.' && segment !== '..')
}

export const sourceRef = (repository: string, sha: string, path: string) => `${repository}@${sha}:${path}`

export async function fetchImportSources(client: ApiClient, signal?: AbortSignal): Promise<ImportSource[]> {
  const body = await client.request<unknown>(`${IMPORT_PATH}/sources`, { signal })
  return parseContract(importSourceListSchema, 'GET studio/import/sources', body)
}

export async function startImport(client: ApiClient, request: ImportRequest): Promise<ImportJob> {
  const body = await client.request<unknown>(IMPORT_PATH, { method: 'POST', body: JSON.stringify(request) })
  return parseContract(importJobSchema, 'POST studio/import', body)
}

export async function fetchImportJob(client: ApiClient, id: string, signal?: AbortSignal): Promise<ImportJob> {
  const body = await client.request<unknown>(`${IMPORT_PATH}/${encodeURIComponent(id)}`, { signal })
  return parseContract(importJobSchema, `GET studio/import/${id}`, body)
}

export async function fetchCourses(client: ApiClient, signal?: AbortSignal): Promise<CourseOption[]> {
  const body = await client.request<unknown>(COURSE_RECORDS, { signal })
  return parseContract(courseRecordPageSchema, 'GET objects/curso/records', body).content.map((record) => ({
    id: record.id,
    code: record.attributes.codigo ?? '',
    title: record.attributes.titulo ?? record.attributes.codigo ?? record.id
  }))
}

export const importKeys = {
  sources: ['studio', 'import', 'sources'] as const,
  courses: ['studio', 'import', 'courses'] as const,
  job: (id: string) => ['studio', 'import', 'job', id] as const
}

export function useImportSources() {
  const client = useApiClient()
  return useQuery({ queryKey: importKeys.sources, queryFn: ({ signal }) => fetchImportSources(client, signal), retry: retryNetwork })
}

export function useImportCourses() {
  const client = useApiClient()
  return useQuery({ queryKey: importKeys.courses, queryFn: ({ signal }) => fetchCourses(client, signal), retry: retryNetwork })
}

// lo que responde el 202 ya es el primer estado del trabajo
export function useStartImport() {
  const client = useApiClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: ImportRequest) => startImport(client, request),
    onSuccess: (job) => queryClient.setQueryData(importKeys.job(job.id), job)
  })
}

// sondeo moderado: para en HECHO o FALLIDO, ante un error (lo retoma «Reintentar») y al desmontar (sin observadores,
// react-query no sondea)
export function useImportJob(id: string, interval: number) {
  const client = useApiClient()
  return useQuery({
    queryKey: importKeys.job(id),
    queryFn: ({ signal }) => fetchImportJob(client, id, signal),
    retry: retryNetwork,
    refetchInterval: (query) => (query.state.status === 'error' || isFinished(query.state.data?.status) ? false : interval)
  })
}
