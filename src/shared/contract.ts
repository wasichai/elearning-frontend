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
