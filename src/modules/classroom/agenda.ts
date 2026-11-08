import { useQuery } from '@tanstack/react-query'
import { useApiClient, type ApiClient } from '@wasichai/core'
import { z } from 'zod'
import { retryNetwork } from '../../shared/retry'
import { sessionSchema } from '../../shared/sessions'
import { parseContract } from './contract'

// la agenda del estudiante: «Sesiones» en docs/api/lms.md del backend. las sesiones de todas sus matrículas que no estén retiradas,
// de cualquier estado, cuyo inicio cae en [from, to), por inicio. una lista plana: cada sesión dice de qué matrícula y curso es.
// la leen el panel («Esta semana») y el horario, cada uno con su intervalo (como mucho 62 días: más es un 400)

const AGENDA_PATH = '/lms/classroom/sessions'

export const agendaSessionSchema = sessionSchema.safeExtend({
  enrollmentId: z.string().min(1),
  courseTitle: z.string(),
  offeringCode: z.string()
})

export const agendaSchema = z.array(agendaSessionSchema)

export type AgendaSession = z.infer<typeof agendaSessionSchema>

export interface AgendaRange {
  // instantes ISO-8601 con zona; el servidor no admite un intervalo vacío, invertido ni de más de 62 días
  from: string
  to: string
}

// un instante con zona y sin milisegundos, como lo escribe el contrato (2026-11-10T00:00:00Z)
export function isoInstant(at: number | Date): string {
  return new Date(at).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

// un desplazamiento +hh:mm tiene que ir como %2B: encodeURIComponent lo hace con cualquier instante
export function agendaPath({ from, to }: AgendaRange): string {
  return `${AGENDA_PATH}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
}

export async function fetchAgenda(client: ApiClient, range: AgendaRange, signal?: AbortSignal): Promise<AgendaSession[]> {
  const body = await client.request<unknown>(agendaPath(range), { signal })
  return parseContract(agendaSchema, 'GET classroom/sessions', body)
}

// bajo 'classroom': lo que invalida todo el aula también la vuelve a leer
export const agendaKeys = {
  all: ['classroom', 'agenda'] as const,
  range: ({ from, to }: AgendaRange) => ['classroom', 'agenda', from, to] as const
}

// el intervalo es parte de la clave: quien lo calcule debe darlo estable (redondeado), o cada render pediría otra vez
export function useAgenda(range: AgendaRange, { enabled = true }: { enabled?: boolean } = {}) {
  const client = useApiClient()
  return useQuery({ queryKey: agendaKeys.range(range), queryFn: ({ signal }) => fetchAgenda(client, range, signal), retry: retryNetwork, enabled })
}
