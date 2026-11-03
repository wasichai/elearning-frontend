import { useQuery } from '@tanstack/react-query'
import { ApiError, useApiClient, type ApiClient } from '@wasichai/core'
import { z } from 'zod'
import { parseContract } from './contract'
import { retryNetwork } from './retry'

// los términos de uso (ADR-0037 del backend, docs/api/lms.md), que usan cuatro módulos: la pantalla (terms), quien los publica
// (administration) y quien recibe su 403 (catalog al matricular y classroom al registrar progreso)

const instant = z.iso.datetime({ offset: true })

export const termsVersionSchema = z.object({
  version: z.number().int().positive(),
  text: z.string(),
  retentionDays: z.number().int().positive(),
  publishedAt: instant
})

export const termsAcceptanceSchema = z.object({
  version: z.number().int().positive(),
  acceptedAt: instant,
  expiresAt: instant,
  withdrawnAt: instant.nullable(),
  valid: z.boolean()
})

export const termsViewSchema = z.object({ current: termsVersionSchema.nullable(), acceptance: termsAcceptanceSchema.nullable() })

export type TermsVersion = z.infer<typeof termsVersionSchema>
export type TermsAcceptance = z.infer<typeof termsAcceptanceSchema>
export type TermsView = z.infer<typeof termsViewSchema>

// la API, relativa a apiBaseUrl
export const TERMS_PATH = '/lms/terms'
export const TERMS_KEY = ['terms'] as const

// la pantalla de los términos, por su clave: el registro lo permite sin importar el módulo. si no está, links.has(…) es false
export const TERMS_ROUTE = 'terms:terms'
// a dónde volver después de aceptar
export const RETURN_TO_PARAM = 'returnTo'

export async function fetchTerms(client: ApiClient, signal?: AbortSignal): Promise<TermsView> {
  return parseContract(termsViewSchema, 'GET terms', await client.request<unknown>(TERMS_PATH, { signal }))
}

export function useTermsView({ enabled = true }: { enabled?: boolean } = {}) {
  const client = useApiClient()
  return useQuery({ queryKey: TERMS_KEY, queryFn: ({ signal }) => fetchTerms(client, signal), enabled, retry: retryNetwork, staleTime: 0 })
}

// none: nunca aceptó, o ya se suprimió lo anterior. older: publicar otra versión no altera ninguna aceptación, así que la anterior sigue valiendo
// y aceptar la nueva es voluntario. withdrawn y expired ya no valen: sus datos se están suprimiendo y aceptar da 409 hasta que termine
export type AcceptanceState = 'none' | 'current' | 'older' | 'withdrawn' | 'expired'

export function acceptanceState({ current, acceptance }: TermsView): AcceptanceState {
  if (!acceptance) return 'none'
  if (acceptance.valid) return acceptance.version === current?.version ? 'current' : 'older'
  return acceptance.withdrawnAt ? 'withdrawn' : 'expired'
}

export type TermsRefusal = 'none' | 'checking' | 'terms' | 'other' | 'unknown'

// por qué un 403 de matricularse o de registrar progreso. el problema del servidor es igual para cualquier 403 salvo por un detail en
// español que no es un contrato: se pregunta a GET /terms. las dos puertas comprueban la aceptación antes que el resto (EnrollmentService y
// LessonProgressService), así que sin aceptación vigente el 403 es por ella, y con una vigente es por otra cosa.
// unknown: no se pudo comprobar, y no se supone nada
export function useTermsRefusal(error: unknown): TermsRefusal {
  const refused = error instanceof ApiError && error.status === 403
  const view = useTermsView({ enabled: refused })
  if (!refused) return 'none'
  if (view.isFetching) return 'checking'
  if (view.isError || !view.data) return 'unknown'
  return view.data.acceptance?.valid ? 'other' : 'terms'
}

// origen de usar y tirar: solo para ver si el valor se escapa de él
const BASE = 'http://elearning.invalid'

// la ruta del router a la que volver, o null si no es de fiar: solo rutas '/…' propias (sin esquema ni servidor, ni '//' ni '/\'), y ninguna de
// `refused` (el login o esta misma pantalla, que serían un bucle). la misma regla que el login de @wasichai/core, que no exporta la suya
export function safeReturnTo(value: string | null | undefined, refused: readonly string[]): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
  let url: URL
  try {
    url = new URL(value, BASE)
  } catch {
    return null
  }
  // el analizador quita tabuladores y saltos y lee '\' como '/': '/\t/mal.example' solo enseña su servidor aquí
  if (url.origin !== BASE) return null
  // el router no distingue mayúsculas ni la barra final
  const normalize = (path: string) => path.replace(/\/+$/, '').toLowerCase()
  if (refused.some((path) => normalize(path) === normalize(url.pathname))) return null
  return url.pathname + url.search + url.hash
}
