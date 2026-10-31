import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiClient, type ApiClient } from '@wasichai/core'
import { retryNetwork } from '../../shared/retry'
import {
  parseContract,
  reviewCommentSchema,
  studioVersionDetailSchema,
  studioVersionListSchema,
  studioVersionSchema,
  type Decision,
  type ReviewComment,
  type StudioVersion,
  type StudioVersionDetail,
  versionDiffSchema,
  type VersionDiff
} from './contract'

// la API de la bandeja del revisor, con sesión, relativa a apiBaseUrl
const VERSIONS_PATH = '/lms/review/versions'

const versionPath = (id: string) => `${VERSIONS_PATH}/${encodeURIComponent(id)}`
const commentPath = (id: string) => `/lms/review/comments/${encodeURIComponent(id)}`

export async function fetchInbox(client: ApiClient, signal?: AbortSignal): Promise<StudioVersion[]> {
  const body = await client.request<unknown>(VERSIONS_PATH, { signal })
  return parseContract(studioVersionListSchema, 'GET review/versions', body)
}

export async function fetchVersion(client: ApiClient, id: string, signal?: AbortSignal): Promise<StudioVersionDetail> {
  const body = await client.request<unknown>(versionPath(id), { signal })
  return parseContract(studioVersionDetailSchema, `GET review/versions/${id}`, body)
}

// contra la versión anterior del mismo curso; se calcula al pedirla
export async function fetchVersionDiff(client: ApiClient, id: string, signal?: AbortSignal): Promise<VersionDiff> {
  const body = await client.request<unknown>(`${versionPath(id)}/diff`, { signal })
  return parseContract(versionDiffSchema, `GET review/versions/${id}/diff`, body)
}

export interface NewComment {
  section: string
  text: string
}

export async function postComment(client: ApiClient, id: string, comment: NewComment): Promise<ReviewComment> {
  const body = await client.request<unknown>(`${versionPath(id)}/comments`, { method: 'POST', body: JSON.stringify(comment) })
  return parseContract(reviewCommentSchema, `POST review/versions/${id}/comments`, body)
}

export async function resolveComment(client: ApiClient, commentId: string): Promise<ReviewComment> {
  const body = await client.request<unknown>(`${commentPath(commentId)}/resolve`, { method: 'POST' })
  return parseContract(reviewCommentSchema, `POST review/comments/${commentId}/resolve`, body)
}

// reason va con null al aprobar; en lo demás es obligatorio (400 sin él)
export interface DecisionInput {
  decision: Decision
  reason: string | null
}

export async function postDecision(client: ApiClient, id: string, decision: DecisionInput): Promise<StudioVersion> {
  const body = await client.request<unknown>(`${versionPath(id)}/decision`, { method: 'POST', body: JSON.stringify(decision) })
  return parseContract(studioVersionSchema, `POST review/versions/${id}/decision`, body)
}

export async function postPublish(client: ApiClient, id: string): Promise<StudioVersion> {
  const body = await client.request<unknown>(`${versionPath(id)}/publish`, { method: 'POST' })
  return parseContract(studioVersionSchema, `POST review/versions/${id}/publish`, body)
}

export const reviewKeys = {
  inbox: ['review', 'inbox'] as const,
  version: (id: string) => ['review', 'version', id] as const,
  // fuera de version(id): comentar, decidir o publicar no cambia el contenido, y releerla no debe esperar a la comparación
  diff: (id: string) => ['review', 'diff', id] as const
}

export function useInbox() {
  const client = useApiClient()
  return useQuery({ queryKey: reviewKeys.inbox, queryFn: ({ signal }) => fetchInbox(client, signal), retry: retryNetwork })
}

export function useVersion(id: string) {
  const client = useApiClient()
  return useQuery({ queryKey: reviewKeys.version(id), queryFn: ({ signal }) => fetchVersion(client, id, signal), retry: retryNetwork })
}

export function useVersionDiff(id: string) {
  const client = useApiClient()
  return useQuery({ queryKey: reviewKeys.diff(id), queryFn: ({ signal }) => fetchVersionDiff(client, id, signal), retry: retryNetwork })
}

// el servidor manda: tras cualquier cambio, acierte o falle (un 409: otra persona ya decidió), se relee la versión y la bandeja
function useRefresh(id: string) {
  const queryClient = useQueryClient()
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: reviewKeys.version(id) }), queryClient.invalidateQueries({ queryKey: reviewKeys.inbox })])
}

export function useComment(id: string) {
  const client = useApiClient()
  const refresh = useRefresh(id)
  return useMutation({ mutationFn: (comment: NewComment) => postComment(client, id, comment), onSettled: refresh })
}

export function useResolveComment(id: string) {
  const client = useApiClient()
  const refresh = useRefresh(id)
  return useMutation({ mutationFn: (commentId: string) => resolveComment(client, commentId), onSettled: refresh })
}

export function useDecision(id: string) {
  const client = useApiClient()
  const refresh = useRefresh(id)
  return useMutation({ mutationFn: (decision: DecisionInput) => postDecision(client, id, decision), onSettled: refresh })
}

export function usePublish(id: string) {
  const client = useApiClient()
  const refresh = useRefresh(id)
  return useMutation({ mutationFn: () => postPublish(client, id), onSettled: refresh })
}
