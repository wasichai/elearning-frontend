import { useQuery } from '@tanstack/react-query'
import { useApiClient, type ApiClient } from '@wasichai/core'
import { retryNetwork } from '../../shared/retry'
import { classroomSchema, enrollmentListSchema, parseContract, type Classroom, type Enrollment } from './contract'

// la API del aula, con sesión, relativa a apiBaseUrl (el cliente de @wasichai/core pone el token y la base)
const ENROLLMENTS_PATH = '/lms/classroom/enrollments'

export function enrollmentPath(enrollmentId: string): string {
  return `${ENROLLMENTS_PATH}/${encodeURIComponent(enrollmentId)}`
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
