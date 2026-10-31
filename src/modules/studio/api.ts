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
  type VersionDiff
} from './contract'

// la API del estudio, con sesión, relativa a apiBaseUrl
const STUDIO_PATH = '/lms/studio'
const versionPath = (id: string) => `${STUDIO_PATH}/versions/${encodeURIComponent(id)}`

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

export const studioKeys = {
  all: ['studio'] as const,
  versions: ['studio', 'versions'] as const,
  version: (id: string) => ['studio', 'version', id] as const,
  // fuera de version(id): enviar no cambia el contenido, y releerla no debe esperar a la comparación
  diff: (id: string) => ['studio', 'diff', id] as const
}

export function useVersions() {
  const client = useApiClient()
  return useQuery({ queryKey: studioKeys.versions, queryFn: ({ signal }) => fetchVersions(client, signal), retry: retryNetwork })
}

export function useVersion(id: string) {
  const client = useApiClient()
  return useQuery({ queryKey: studioKeys.version(id), queryFn: ({ signal }) => fetchVersion(client, id, signal), retry: retryNetwork })
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
