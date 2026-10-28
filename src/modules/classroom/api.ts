import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiClient, type ApiClient } from '@wasichai/core'
import { retryNetwork } from '../../shared/retry'
import { sessionListSchema, type Session } from '../../shared/sessions'
import {
  attemptSchema,
  certificateSchema,
  completionSchema,
  classroomSchema,
  submissionSchema,
  enrollmentListSchema,
  lessonProgressSchema,
  parseContract,
  type Answer,
  type Attempt,
  type Certificate,
  type CompletionStatus,
  type Classroom,
  type Enrollment,
  type LessonEventType,
  type LessonProgress,
  type Submission
} from './contract'
import { uploadFile } from './files'

// la API del aula, con sesión, relativa a apiBaseUrl (el cliente de @wasichai/core pone el token y la base)
const ENROLLMENTS_PATH = '/lms/classroom/enrollments'

export function enrollmentPath(enrollmentId: string): string {
  return `${ENROLLMENTS_PATH}/${encodeURIComponent(enrollmentId)}`
}

export function lessonEventsPath(enrollmentId: string, lessonId: string): string {
  return `${enrollmentPath(enrollmentId)}/lessons/${encodeURIComponent(lessonId)}/events`
}

const ATTEMPTS_PATH = '/lms/classroom/attempts'

export function attemptsPath(enrollmentId: string, lessonId: string): string {
  return `${enrollmentPath(enrollmentId)}/lessons/${encodeURIComponent(lessonId)}/attempts`
}

export function attemptPath(attemptId: string): string {
  return `${ATTEMPTS_PATH}/${encodeURIComponent(attemptId)}`
}

export async function fetchEnrollments(client: ApiClient, signal?: AbortSignal): Promise<Enrollment[]> {
  const body = await client.request<unknown>(ENROLLMENTS_PATH, { signal })
  return parseContract(enrollmentListSchema, 'GET classroom/enrollments', body)
}

export async function fetchClassroom(client: ApiClient, enrollmentId: string, signal?: AbortSignal): Promise<Classroom> {
  const body = await client.request<unknown>(enrollmentPath(enrollmentId), { signal })
  return parseContract(classroomSchema, `GET classroom/enrollments/${enrollmentId}`, body)
}

export const classroomKeys = {
  all: ['classroom'] as const,
  enrollments: ['classroom', 'enrollments'] as const,
  classroom: (enrollmentId: string) => ['classroom', 'enrollment', enrollmentId] as const,
  attempt: (attemptId: string) => ['classroom', 'attempt', attemptId] as const,
  sessions: (enrollmentId: string) => ['classroom', 'enrollment', enrollmentId, 'sessions'] as const,
  completion: (enrollmentId: string) => ['classroom', 'enrollment', enrollmentId, 'completion'] as const,
  certificate: (code: string) => ['classroom', 'certificate', code] as const
}

export function useEnrollments() {
  const client = useApiClient()
  return useQuery({
    queryKey: classroomKeys.enrollments,
    queryFn: ({ signal }) => fetchEnrollments(client, signal),
    retry: retryNetwork
  })
}

export function useClassroom(enrollmentId: string) {
  const client = useApiClient()
  return useQuery({
    queryKey: classroomKeys.classroom(enrollmentId),
    queryFn: ({ signal }) => fetchClassroom(client, enrollmentId, signal),
    retry: retryNetwork
  })
}

// un hecho del aprendizaje (ADR-0012): abrir una lección, terminar su vídeo o marcarla como completada.
// clientEventId lo pone el cliente, una vez por hecho: repetir el mismo envío no cuenta dos veces en el servidor
export interface LessonEvent {
  lessonId: string
  type: LessonEventType
  clientEventId: string
}

export function lessonEvent(lessonId: string, type: LessonEventType): LessonEvent {
  return { lessonId, type, clientEventId: crypto.randomUUID() }
}

export async function postLessonEvent(client: ApiClient, enrollmentId: string, event: LessonEvent): Promise<LessonProgress> {
  const body = await client.request<unknown>(lessonEventsPath(enrollmentId, event.lessonId), {
    method: 'POST',
    body: JSON.stringify({ type: event.type, clientEventId: event.clientEventId })
  })
  return parseContract(lessonProgressSchema, `POST classroom/enrollments/${enrollmentId}/lessons/${event.lessonId}/events`, body)
}

function withLessonProgress(classroom: Classroom, lessonId: string, progress: LessonProgress): Classroom {
  return {
    ...classroom,
    units: classroom.units.map((unit) => ({ ...unit, lessons: unit.lessons.map((lesson) => (lesson.id === lessonId ? { ...lesson, progress } : lesson)) }))
  }
}

// el servidor manda: el progreso que devuelve se pone en la lección al momento y luego se vuelve a leer el aula (y la
// lista de «Mis cursos»), que trae el avance de cada unidad, el total y la siguiente lección calculados por él.
// también tras un error: un 409 dice que la interfaz creía otra cosa de la lección
export function useLessonEvent(enrollmentId: string) {
  const client = useApiClient()
  const queryClient = useQueryClient()
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: classroomKeys.classroom(enrollmentId) }),
      queryClient.invalidateQueries({ queryKey: classroomKeys.enrollments })
    ])
  return useMutation({
    mutationFn: (event: LessonEvent) => postLessonEvent(client, enrollmentId, event),
    onSuccess: (progress, event) => {
      queryClient.setQueryData<Classroom>(classroomKeys.classroom(enrollmentId), (classroom) =>
        classroom ? withLessonProgress(classroom, event.lessonId, progress) : classroom
      )
      void refresh()
    },
    onError: () => void refresh()
  })
}

// los intentos de una evaluación (ADR-0016). el servidor impone intentos y plazo: la interfaz los muestra, no los decide

// empezar (201) o retomar el que ya está abierto (200): las dos respuestas son el intento
export async function startAttempt(client: ApiClient, enrollmentId: string, lessonId: string): Promise<Attempt> {
  const body = await client.request<unknown>(attemptsPath(enrollmentId, lessonId), { method: 'POST', body: '{}' })
  return parseContract(attemptSchema, `POST classroom/enrollments/${enrollmentId}/lessons/${lessonId}/attempts`, body)
}

export async function fetchAttempt(client: ApiClient, attemptId: string, signal?: AbortSignal): Promise<Attempt> {
  const body = await client.request<unknown>(attemptPath(attemptId), { signal })
  return parseContract(attemptSchema, `GET classroom/attempts/${attemptId}`, body)
}

// lo que se envía de una respuesta: sin la entrega con su archivo, que es del servidor
export type AnswerInput = Omit<Answer, 'submission'>

// se guardan todas las respuestas del intento a la vez, con la misma forma que Attempt.answers
export async function saveAnswers(client: ApiClient, attemptId: string, answers: AnswerInput[]): Promise<Attempt> {
  const body = await client.request<unknown>(`${attemptPath(attemptId)}/answers`, { method: 'PUT', body: JSON.stringify({ answers }) })
  return parseContract(attemptSchema, `PUT classroom/attempts/${attemptId}/answers`, body)
}

export async function submitAttempt(client: ApiClient, attemptId: string): Promise<Attempt> {
  const body = await client.request<unknown>(`${attemptPath(attemptId)}/submit`, { method: 'POST', body: '{}' })
  return parseContract(attemptSchema, `POST classroom/attempts/${attemptId}/submit`, body)
}

export async function createSubmission(client: ApiClient, attemptId: string, questionId: string): Promise<Submission> {
  const body = await client.request<unknown>(`${attemptPath(attemptId)}/questions/${encodeURIComponent(questionId)}/submission`, { method: 'POST', body: '{}' })
  return parseContract(submissionSchema, `POST classroom/attempts/${attemptId}/questions/${questionId}/submission`, body)
}

export function useAttempt(attemptId: string) {
  const client = useApiClient()
  return useQuery({ queryKey: classroomKeys.attempt(attemptId), queryFn: ({ signal }) => fetchAttempt(client, attemptId, signal), retry: retryNetwork })
}

// tras cualquier cambio de un intento (o un 409: el servidor ya lo cerró) se vuelven a leer el intento y el aula, que
// trae los intentos usados, el mejor resultado y el progreso de la lección
function useAttemptRefresh(enrollmentId: string) {
  const queryClient = useQueryClient()
  return (attemptId?: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: classroomKeys.classroom(enrollmentId) }),
      queryClient.invalidateQueries({ queryKey: classroomKeys.enrollments }),
      attemptId ? queryClient.invalidateQueries({ queryKey: classroomKeys.attempt(attemptId) }) : undefined
    ])
}

export function useStartAttempt(enrollmentId: string) {
  const client = useApiClient()
  const queryClient = useQueryClient()
  const refresh = useAttemptRefresh(enrollmentId)
  return useMutation({
    mutationFn: (lessonId: string) => startAttempt(client, enrollmentId, lessonId),
    onSuccess: (attempt) => {
      queryClient.setQueryData(classroomKeys.attempt(attempt.id), attempt)
      void refresh()
    },
    onError: () => void refresh()
  })
}

export function useSaveAnswers(enrollmentId: string, attemptId: string) {
  const client = useApiClient()
  const queryClient = useQueryClient()
  const refresh = useAttemptRefresh(enrollmentId)
  return useMutation({
    mutationFn: (answers: AnswerInput[]) => saveAnswers(client, attemptId, answers),
    onSuccess: (attempt) => queryClient.setQueryData(classroomKeys.attempt(attemptId), attempt),
    onError: () => void refresh(attemptId)
  })
}

// enviar guarda antes las respuestas: lo último que se escribió entra en el intento
export function useSubmitAttempt(enrollmentId: string, attemptId: string) {
  const client = useApiClient()
  const queryClient = useQueryClient()
  const refresh = useAttemptRefresh(enrollmentId)
  return useMutation({
    mutationFn: async (answers: AnswerInput[]) => {
      await saveAnswers(client, attemptId, answers)
      return submitAttempt(client, attemptId)
    },
    onSuccess: (attempt) => {
      queryClient.setQueryData(classroomKeys.attempt(attemptId), attempt)
      void refresh()
    },
    onError: () => void refresh(attemptId)
  })
}

// la entrega de una pregunta FILE: se crea, se sube el archivo a su uploadUrl y se devuelve para guardarla en la respuesta
export function useUploadSubmission(attemptId: string) {
  const client = useApiClient()
  return useMutation({
    mutationFn: async ({ questionId, file }: { questionId: string; file: File }) => {
      const created = await createSubmission(client, attemptId, questionId)
      await uploadFile(client, created.uploadUrl, file)
      return created
    }
  })
}

// sesiones, finalización y certificado (ADR-0016)

export async function fetchSessions(client: ApiClient, enrollmentId: string, signal?: AbortSignal): Promise<Session[]> {
  const body = await client.request<unknown>(`${enrollmentPath(enrollmentId)}/sessions`, { signal })
  return parseContract(sessionListSchema, `GET classroom/enrollments/${enrollmentId}/sessions`, body)
}

export async function fetchCompletion(client: ApiClient, enrollmentId: string, signal?: AbortSignal): Promise<CompletionStatus> {
  const body = await client.request<unknown>(`${enrollmentPath(enrollmentId)}/completion`, { signal })
  return parseContract(completionSchema, `GET classroom/enrollments/${enrollmentId}/completion`, body)
}

// 201 si se emite, 200 si ya estaba emitido (con el nombre de entonces): las dos son el certificado
export async function requestCertificate(client: ApiClient, enrollmentId: string, holderName: string): Promise<Certificate> {
  const body = await client.request<unknown>(`${enrollmentPath(enrollmentId)}/certificate`, { method: 'POST', body: JSON.stringify({ holderName }) })
  return parseContract(certificateSchema, `POST classroom/enrollments/${enrollmentId}/certificate`, body)
}

// la verificación pública, sin sesión
export async function fetchPublicCertificate(client: ApiClient, code: string, signal?: AbortSignal): Promise<Certificate> {
  const body = await client.request<unknown>(`/lms/public/certificates/${encodeURIComponent(code)}`, { signal })
  return parseContract(certificateSchema, `GET public/certificates/${code}`, body)
}

export function useSessions(enrollmentId: string) {
  const client = useApiClient()
  return useQuery({ queryKey: classroomKeys.sessions(enrollmentId), queryFn: ({ signal }) => fetchSessions(client, enrollmentId, signal), retry: retryNetwork })
}

export function useCompletion(enrollmentId: string) {
  const client = useApiClient()
  return useQuery({
    queryKey: classroomKeys.completion(enrollmentId),
    queryFn: ({ signal }) => fetchCompletion(client, enrollmentId, signal),
    retry: retryNetwork
  })
}

// un 404 es la respuesta de la verificación (no existe ese código), no un fallo que reintentar
export function usePublicCertificate(code: string) {
  const client = useApiClient()
  return useQuery({ queryKey: classroomKeys.certificate(code), queryFn: ({ signal }) => fetchPublicCertificate(client, code, signal), retry: retryNetwork })
}

// pedir el certificado. tras la respuesta, o tras un 409 (reglas pendientes: el ApiError de core no trae el cuerpo con
// sus reglas, así que se vuelve a leer la finalización), se releen la finalización, el aula y la lista de matrículas
export function useRequestCertificate(enrollmentId: string) {
  const client = useApiClient()
  const queryClient = useQueryClient()
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: classroomKeys.completion(enrollmentId) }),
      queryClient.invalidateQueries({ queryKey: classroomKeys.classroom(enrollmentId) }),
      queryClient.invalidateQueries({ queryKey: classroomKeys.enrollments })
    ])
  return useMutation({
    mutationFn: (holderName: string) => requestCertificate(client, enrollmentId, holderName),
    onSuccess: (certificate) => {
      queryClient.setQueryData(classroomKeys.certificate(certificate.code), certificate)
      void refresh()
    },
    onError: () => void refresh()
  })
}
