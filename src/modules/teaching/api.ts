import { useQuery } from '@tanstack/react-query'
import { useApiClient, type ApiClient } from '@wasichai/core'
import { retryNetwork } from '../../shared/retry'
import { parseContract, rosterSchema, teachingOfferingListSchema, type RosterEntry, type TeachingOffering } from './contract'

// la API del espacio docente, con sesión, relativa a apiBaseUrl
const OFFERINGS_PATH = '/lms/teaching/offerings'

export function offeringPath(code: string): string {
  return `${OFFERINGS_PATH}/${encodeURIComponent(code)}`
}

export async function fetchOfferings(client: ApiClient, signal?: AbortSignal): Promise<TeachingOffering[]> {
  const body = await client.request<unknown>(OFFERINGS_PATH, { signal })
  return parseContract(teachingOfferingListSchema, 'GET teaching/offerings', body)
}

export async function fetchRoster(client: ApiClient, code: string, signal?: AbortSignal): Promise<RosterEntry[]> {
  const body = await client.request<unknown>(`${offeringPath(code)}/students`, { signal })
  return parseContract(rosterSchema, `GET teaching/offerings/${code}/students`, body)
}

export const teachingKeys = {
  all: ['teaching'] as const,
  offerings: ['teaching', 'offerings'] as const,
  roster: (code: string) => ['teaching', 'offering', code, 'students'] as const
}

export function useOfferings() {
  const client = useApiClient()
  return useQuery({ queryKey: teachingKeys.offerings, queryFn: ({ signal }) => fetchOfferings(client, signal), retry: retryNetwork })
}

export function useRoster(code: string) {
  const client = useApiClient()
  return useQuery({ queryKey: teachingKeys.roster(code), queryFn: ({ signal }) => fetchRoster(client, code, signal), retry: retryNetwork })
}
