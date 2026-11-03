import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiClient, type ApiClient } from '@wasichai/core'
import { retryNetwork } from '../../shared/retry'
import { attemptSchema, type Attempt } from '../../shared/attempts'
import { sessionListSchema, sessionSchema, type AttendanceStatus, type Session, type SessionType } from '../../shared/sessions'
import {
  attendanceRowListSchema,
  parseContract,
  pendingAttemptListSchema,
  rosterSchema,
  teachingOfferingListSchema,
  teachingPanelSchema,
  type AttendanceRow,
  type PendingAttempt,
  type RecurrencePattern,
  type RosterEntry,
  type TeachingOffering,
  type TeachingPanelItem,
  type WeekDay
} from './contract'

// la API del espacio docente, con sesión, relativa a apiBaseUrl
const OFFERINGS_PATH = '/lms/teaching/offerings'

export function offeringPath(code: string): string {
  return `${OFFERINGS_PATH}/${encodeURIComponent(code)}`
}

export async function fetchOfferings(client: ApiClient, signal?: AbortSignal): Promise<TeachingOffering[]> {
  const body = await client.request<unknown>(OFFERINGS_PATH, { signal })
  return parseContract(teachingOfferingListSchema, 'GET teaching/offerings', body)
}

const PANEL_PATH = '/lms/teaching/panel'
// lo que se pide de una vez: el contrato acota size a 1–200
export const PANEL_PAGE_SIZE = 100
// por si un servidor nunca diera una página corta: nadie enseña tantas a la vez, y pasarlo es un fallo, no una lista completa
export const MAX_PANEL_PAGES = 20

// todas las páginas, o ningún dato: una página con menos de size es la última, y si una falla, falla todo. entre dos páginas la lista
// puede moverse: una edición repetida cuenta una vez
export async function fetchTeachingPanel(client: ApiClient, signal?: AbortSignal): Promise<TeachingPanelItem[]> {
  const items = new Map<string, TeachingPanelItem>()
  for (let page = 0; page < MAX_PANEL_PAGES; page++) {
    const body = await client.request<unknown>(`${PANEL_PATH}?page=${page}&size=${PANEL_PAGE_SIZE}`, { signal })
    const read = parseContract(teachingPanelSchema, 'GET teaching/panel', body)
    read.forEach((item) => items.set(item.code, item))
    if (read.length < PANEL_PAGE_SIZE) return [...items.values()]
  }
  throw new Error(`GET teaching/panel: más de ${MAX_PANEL_PAGES} páginas`)
}

export async function fetchRoster(client: ApiClient, code: string, signal?: AbortSignal): Promise<RosterEntry[]> {
  const body = await client.request<unknown>(`${offeringPath(code)}/students`, { signal })
  return parseContract(rosterSchema, `GET teaching/offerings/${code}/students`, body)
}

export const teachingKeys = {
  all: ['teaching'] as const,
  offerings: ['teaching', 'offerings'] as const,
  // bajo la lista de ediciones: lo que la invalida (una nota) también lo vuelve a leer
  panel: ['teaching', 'offerings', 'panel'] as const,
  roster: (code: string) => ['teaching', 'offering', code, 'students'] as const,
  queue: (code: string) => ['teaching', 'offering', code, 'attempts'] as const,
  attempt: (attemptId: string) => ['teaching', 'attempt', attemptId] as const,
  sessions: (code: string) => ['teaching', 'offering', code, 'sessions'] as const,
  attendance: (sessionId: string) => ['teaching', 'session', sessionId, 'attendance'] as const
}

export function useTeachingPanel() {
  const client = useApiClient()
  return useQuery({ queryKey: teachingKeys.panel, queryFn: ({ signal }) => fetchTeachingPanel(client, signal), retry: retryNetwork })
}

// el panel ya trae las ediciones: al entrar en una desde él, la cabecera tiene su título mientras llega la lista
export function useOfferings({ enabled = true }: { enabled?: boolean } = {}) {
  const client = useApiClient()
  const queryClient = useQueryClient()
  return useQuery<TeachingOffering[]>({
    queryKey: teachingKeys.offerings,
    queryFn: ({ signal }) => fetchOfferings(client, signal),
    retry: retryNetwork,
    enabled,
    placeholderData: () => queryClient.getQueryData<TeachingPanelItem[]>(teachingKeys.panel)
  })
}

export function useRoster(code: string) {
  const client = useApiClient()
  return useQuery({ queryKey: teachingKeys.roster(code), queryFn: ({ signal }) => fetchRoster(client, code, signal), retry: retryNetwork })
}

// corrección (ADR-0016)
const attemptPath = (attemptId: string) => `/lms/teaching/attempts/${encodeURIComponent(attemptId)}`
const sessionPath = (sessionId: string) => `/lms/teaching/sessions/${encodeURIComponent(sessionId)}`

export async function fetchQueue(client: ApiClient, code: string, signal?: AbortSignal): Promise<PendingAttempt[]> {
  const body = await client.request<unknown>(`${offeringPath(code)}/attempts`, { signal })
  return parseContract(pendingAttemptListSchema, `GET teaching/offerings/${code}/attempts`, body)
}

export async function fetchTeachingAttempt(client: ApiClient, attemptId: string, signal?: AbortSignal): Promise<Attempt> {
  const body = await client.request<unknown>(attemptPath(attemptId), { signal })
  return parseContract(attemptSchema, `GET teaching/attempts/${attemptId}`, body)
}

// reason va con null en una primera nota; al cambiar una ya puesta es obligatorio (409 sin él)
export interface GradeInput {
  questionId: string
  points: number
  comment: string | null
  reason: string | null
}

export async function postGrade(client: ApiClient, attemptId: string, grade: GradeInput): Promise<Attempt> {
  const body = await client.request<unknown>(`${attemptPath(attemptId)}/grades`, { method: 'POST', body: JSON.stringify(grade) })
  return parseContract(attemptSchema, `POST teaching/attempts/${attemptId}/grades`, body)
}

export function useQueue(code: string) {
  const client = useApiClient()
  return useQuery({ queryKey: teachingKeys.queue(code), queryFn: ({ signal }) => fetchQueue(client, code, signal), retry: retryNetwork })
}

export function useTeachingAttempt(attemptId: string) {
  const client = useApiClient()
  return useQuery({ queryKey: teachingKeys.attempt(attemptId), queryFn: ({ signal }) => fetchTeachingAttempt(client, attemptId, signal), retry: retryNetwork })
}

// el servidor manda: su intento se pinta al momento y se releen la cola y los resúmenes de la edición. tras un error
// (un 409: otra persona ya la calificó) se relee el intento, y el formulario pasa a pedir el motivo
export function useGrade(code: string, attemptId: string) {
  const client = useApiClient()
  const queryClient = useQueryClient()
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: teachingKeys.queue(code) }),
      queryClient.invalidateQueries({ queryKey: teachingKeys.roster(code) }),
      queryClient.invalidateQueries({ queryKey: teachingKeys.offerings })
    ])
  return useMutation({
    mutationFn: (grade: GradeInput) => postGrade(client, attemptId, grade),
    onSuccess: (attempt) => {
      queryClient.setQueryData(teachingKeys.attempt(attemptId), attempt)
      void refresh()
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: teachingKeys.attempt(attemptId) })
  })
}

// sesiones y asistencia (ADR-0016)

export interface NewSessions {
  title: string
  type: SessionType
  modality: Session['modality']
  durationMinutes: number
  link: string | null
  location: string | null
  lessonId: null
  // solo en una sesión de recuperación
  originalSessionId?: string
  recurrence: { pattern: RecurrencePattern; days: WeekDay[]; startDate: string; endDate: string; localTime: string }
}

export interface Reschedule {
  date: string
  localTime: string
  reason: string
}

export interface AttendanceChange {
  records: { enrollmentId: string; status: AttendanceStatus }[]
  reason: string | null
}

export async function fetchOfferingSessions(client: ApiClient, code: string, signal?: AbortSignal): Promise<Session[]> {
  const body = await client.request<unknown>(`${offeringPath(code)}/sessions`, { signal })
  return parseContract(sessionListSchema, `GET teaching/offerings/${code}/sessions`, body)
}

export async function createSessions(client: ApiClient, code: string, sessions: NewSessions): Promise<Session[]> {
  const body = await client.request<unknown>(`${offeringPath(code)}/sessions`, { method: 'POST', body: JSON.stringify(sessions) })
  return parseContract(sessionListSchema, `POST teaching/offerings/${code}/sessions`, body)
}

export async function rescheduleSession(client: ApiClient, sessionId: string, change: Reschedule): Promise<Session> {
  const body = await client.request<unknown>(`${sessionPath(sessionId)}/reschedule`, { method: 'POST', body: JSON.stringify(change) })
  return parseContract(sessionSchema, `POST teaching/sessions/${sessionId}/reschedule`, body)
}

export async function cancelSession(client: ApiClient, sessionId: string, reason: string): Promise<Session> {
  const body = await client.request<unknown>(`${sessionPath(sessionId)}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) })
  return parseContract(sessionSchema, `POST teaching/sessions/${sessionId}/cancel`, body)
}

export async function fetchAttendance(client: ApiClient, sessionId: string, signal?: AbortSignal): Promise<AttendanceRow[]> {
  const body = await client.request<unknown>(`${sessionPath(sessionId)}/attendance`, { signal })
  return parseContract(attendanceRowListSchema, `GET teaching/sessions/${sessionId}/attendance`, body)
}

export async function saveAttendance(client: ApiClient, sessionId: string, change: AttendanceChange): Promise<AttendanceRow[]> {
  const body = await client.request<unknown>(`${sessionPath(sessionId)}/attendance`, { method: 'PUT', body: JSON.stringify(change) })
  return parseContract(attendanceRowListSchema, `PUT teaching/sessions/${sessionId}/attendance`, body)
}

export function useOfferingSessions(code: string) {
  const client = useApiClient()
  return useQuery({ queryKey: teachingKeys.sessions(code), queryFn: ({ signal }) => fetchOfferingSessions(client, code, signal), retry: retryNetwork })
}

export function useAttendance(sessionId: string) {
  const client = useApiClient()
  return useQuery({ queryKey: teachingKeys.attendance(sessionId), queryFn: ({ signal }) => fetchAttendance(client, sessionId, signal), retry: retryNetwork })
}

function useRefreshSessions(code: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: teachingKeys.sessions(code) })
    void queryClient.invalidateQueries({ queryKey: teachingKeys.panel })
  }
}

export function useCreateSessions(code: string) {
  const client = useApiClient()
  const refresh = useRefreshSessions(code)
  return useMutation({ mutationFn: (sessions: NewSessions) => createSessions(client, code, sessions), onSuccess: refresh })
}

export function useRescheduleSession(code: string, sessionId: string) {
  const client = useApiClient()
  const refresh = useRefreshSessions(code)
  return useMutation({ mutationFn: (change: Reschedule) => rescheduleSession(client, sessionId, change), onSettled: refresh })
}

export function useCancelSession(code: string, sessionId: string) {
  const client = useApiClient()
  const refresh = useRefreshSessions(code)
  return useMutation({ mutationFn: (reason: string) => cancelSession(client, sessionId, reason), onSettled: refresh })
}

// lo que responde el servidor es la asistencia; la edición relee su resumen de matriculados. tras un error se relee por
// si otro docente la registró antes (un 409 sin motivo)
export function useSaveAttendance(code: string, sessionId: string) {
  const client = useApiClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (change: AttendanceChange) => saveAttendance(client, sessionId, change),
    onSuccess: (rows) => {
      queryClient.setQueryData(teachingKeys.attendance(sessionId), rows)
      void queryClient.invalidateQueries({ queryKey: teachingKeys.roster(code) })
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: teachingKeys.attendance(sessionId) })
  })
}
