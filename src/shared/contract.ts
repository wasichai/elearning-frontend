import { z } from 'zod'

// piezas comunes de los contratos de /api/lms/** (docs/api/lms.md del backend) que validan el catálogo y el aula.
// cada módulo declara sus esquemas; aquí solo lo que comparten: zonas, fechas civiles y el error de contrato.

// una zona que Intl no conoce haría fallar el formateo de fechas al pintar: se rechaza con el resto del contrato
export const ianaTimeZone = z.string().refine(
  (zone) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: zone })
      return true
    } catch {
      return false
    }
  },
  { message: 'zona horaria IANA desconocida' }
)

// fecha civil YYYY-MM-DD en la zona de la edición
export const civilDate = z.iso.date()

// los vocabularios de matrícula y edición del modelo (model/model.json del backend), que leen el aula y el espacio docente
export const ENROLLMENT_STATUSES = ['ACTIVA', 'RETIRADA', 'FINALIZADA'] as const
export const OFFERING_STATUSES = ['PROGRAMADA', 'INSCRIPCION_ABIERTA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA'] as const

// lecciones completadas sobre las que se pueden completar; percent es entero 0–100
export const progressSummarySchema = z
  .object({
    completedLessons: z.number().int().nonnegative(),
    totalLessons: z.number().int().nonnegative(),
    percent: z.number().int().min(0).max(100)
  })
  .refine((progress) => progress.completedLessons <= progress.totalLessons, { message: 'más lecciones completadas que lecciones', path: ['completedLessons'] })

export type ProgressSummary = z.infer<typeof progressSummarySchema>

// la respuesta llegó (2xx) pero no cumple el contrato: un desajuste entre versiones de API e interfaz, no un fallo del usuario
export class ContractError extends Error {
  readonly resource: string

  constructor(resource: string, error: z.ZodError) {
    super(`la respuesta de ${resource} no cumple el contrato de la API:\n${z.prettifyError(error)}`)
    this.name = 'ContractError'
    this.resource = resource
  }
}

export function parseContract<T>(schema: z.ZodType<T>, resource: string, body: unknown): T {
  const result = schema.safeParse(body)
  if (!result.success) throw new ContractError(resource, result.error)
  return result.data
}
