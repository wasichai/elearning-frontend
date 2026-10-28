import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiClient, type ApiClient } from '@wasichai/core'
import { retryNetwork } from '../../shared/retry'
import {
  classroomSchema,
  enrollmentListSchema,
  lessonProgressSchema,
  parseContract,
  type Classroom,
  type Enrollment,
  type LessonEventType,
  type LessonProgress
} from './contract'

// la API del aula, con sesión, relativa a apiBaseUrl (el cliente de @wasichai/core pone el token y la base)
const ENROLLMENTS_PATH = '/lms/classroom/enrollments'

export function enrollmentPath(enrollmentId: string): string {
  return `${ENROLLMENTS_PATH}/${encodeURIComponent(enrollmentId)}`
}

export function lessonEventsPath(enrollmentId: string, lessonId: string): string {
  return `${enrollmentPath(enrollmentId)}/lessons/${encodeURIComponent(lessonId)}/events`
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
  classroom: (enrollmentId: string) => ['classroom', 'enrollment', enrollmentId] as const
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
