import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiClient, type ApiClient } from '@wasichai/core'
import { retryNetwork } from '../../shared/retry'
import {
  newVersionSchema,
  parseContract,
  studioVersionDetailSchema,
  studioVersionListSchema,
  studioVersionSchema,
  type NewVersion,
  type StudioVersion,
  type StudioVersionDetail,
  versionDiffSchema,
  type VersionDiff,
  versionRecordPageSchema
} from './contract'

// la API del estudio, con sesión, relativa a apiBaseUrl
const STUDIO_PATH = '/lms/studio'
const versionPath = (id: string) => `${STUDIO_PATH}/versions/${encodeURIComponent(id)}`
const VERSION_RECORDS = '/objects/version_curso/records'

export async function fetchVersions(client: ApiClient, signal?: AbortSignal): Promise<StudioVersion[]> {
  const body = await client.request<unknown>(`${STUDIO_PATH}/versions`, { signal })
  return parseContract(studioVersionListSchema, 'GET studio/versions', body)
}

export async function fetchVersion(client: ApiClient, id: string, signal?: AbortSignal): Promise<StudioVersionDetail> {
  const body = await client.request<unknown>(versionPath(id), { signal })
  return parseContract(studioVersionDetailSchema, `GET studio/versions/${id}`, body)
}

// contra la versión anterior del mismo curso; se calcula al pedirla
export async function fetchVersionDiff(client: ApiClient, id: string, signal?: AbortSignal): Promise<VersionDiff> {
  const body = await client.request<unknown>(`${versionPath(id)}/diff`, { signal })
  return parseContract(versionDiffSchema, `GET studio/versions/${id}/diff`, body)
}

export async function submitVersion(client: ApiClient, id: string): Promise<StudioVersion> {
  const body = await client.request<unknown>(`${versionPath(id)}/submit`, { method: 'POST' })
  return parseContract(studioVersionSchema, `POST studio/versions/${id}/submit`, body)
}

// copia la versión indicada (o, sin ella, la última del curso) a un borrador nuevo de quien lo pide
export async function createVersion(client: ApiClient, courseId: string, fromVersionId: string | null): Promise<NewVersion> {
  const body = await client.request<unknown>(`${STUDIO_PATH}/courses/${encodeURIComponent(courseId)}/versions`, {
    method: 'POST',
    body: JSON.stringify({ fromVersionId })
  })
  return parseContract(newVersionSchema, `POST studio/courses/${courseId}/versions`, body)
}

// si el curso tiene alguna versión que la persona pueda leer, de cualquier autor. GET studio/versions no sirve: solo trae las suyas
export async function fetchCourseHasVersions(client: ApiClient, courseId: string, signal?: AbortSignal): Promise<boolean> {
  const body = await client.request<unknown>(`${VERSION_RECORDS}?curso=${encodeURIComponent(courseId)}&size=1`, { signal })
  return parseContract(versionRecordPageSchema, 'GET objects/version_curso/records', body).content.length > 0
}

export const studioKeys = {
  all: ['studio'] as const,
  versions: ['studio', 'versions'] as const,
  version: (id: string) => ['studio', 'version', id] as const,
  // fuera de version(id): enviar no cambia el contenido, y releerla no debe esperar a la comparación
  diff: (id: string) => ['studio', 'diff', id] as const,
  courseVersions: (courseId: string) => ['studio', 'courseVersions', courseId] as const
}

export function useVersions() {
  const client = useApiClient()
  return useQuery({ queryKey: studioKeys.versions, queryFn: ({ signal }) => fetchVersions(client, signal), retry: retryNetwork })
}

export function useVersion(id: string, enabled = true) {
  const client = useApiClient()
  return useQuery({ queryKey: studioKeys.version(id), queryFn: ({ signal }) => fetchVersion(client, id, signal), retry: retryNetwork, enabled })
}

export function useCourseHasVersions(courseId: string) {
  const client = useApiClient()
  return useQuery({
    queryKey: studioKeys.courseVersions(courseId),
    queryFn: ({ signal }) => fetchCourseHasVersions(client, courseId, signal),
    retry: retryNetwork
  })
}

export function useVersionDiff(id: string) {
  const client = useApiClient()
  return useQuery({ queryKey: studioKeys.diff(id), queryFn: ({ signal }) => fetchVersionDiff(client, id, signal), retry: retryNetwork })
}

// el servidor manda: tras enviar (o tras un 409, otra pestaña ya la envió) se releen la versión y la lista
export function useSubmitVersion(id: string) {
  const client = useApiClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => submitVersion(client, id),
    onSettled: () =>
      Promise.all([queryClient.invalidateQueries({ queryKey: studioKeys.version(id) }), queryClient.invalidateQueries({ queryKey: studioKeys.versions })])
  })
}

export function useNewVersion(courseId: string) {
  const client = useApiClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fromVersionId: string | null) => createVersion(client, courseId, fromVersionId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: studioKeys.versions })
  })
}

// el primer borrador de un curso sin versiones (#270): vacío, a nombre de quien lo pide. con versiones, el servidor copiaría la última:
// solo se ofrece a un curso sin ninguna. se relee en cualquier caso: un 409 significa que otra persona se adelantó
export function useFirstDraft() {
  const client = useApiClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (courseId: string) => createVersion(client, courseId, null),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: studioKeys.versions }),
    onSettled: (_created, _error, courseId) => void queryClient.invalidateQueries({ queryKey: studioKeys.courseVersions(courseId) })
  })
}
