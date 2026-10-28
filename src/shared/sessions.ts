import { z } from 'zod'
import { ianaTimeZone } from './contract'

// la sesión en vivo de una edición (F3, ADR-0016), como la sirven el aula (con la asistencia de quien la mira) y el
// espacio docente (sin ella): «Sesiones» y «Espacio docente» en docs/api/lms.md del backend. la comparten los dos módulos

export const SESSION_TYPES = ['TEORIA', 'LABORATORIO', 'CONSULTA', 'RECUPERACION'] as const
export const SESSION_MODALITIES = ['PRESENCIAL', 'VIRTUAL'] as const
export const SESSION_STATUSES = ['PROGRAMADA', 'REPROGRAMADA', 'CANCELADA'] as const
export const ATTENDANCE_STATUSES = ['PRESENTE', 'TARDE', 'AUSENTE', 'JUSTIFICADO'] as const

export type SessionStatus = (typeof SESSION_STATUSES)[number]
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

const instant = z.iso.datetime({ offset: true })

// el enlace a la reunión solo es https: otro esquema (javascript:, http:) no se pinta nunca como enlace
export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export const sessionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string(),
    type: z.enum(SESSION_TYPES),
    modality: z.enum(SESSION_MODALITIES),
    start: instant,
    end: instant,
    timeZone: ianaTimeZone,
    status: z.enum(SESSION_STATUSES),
    link: z.string().refine(isHttpsUrl, { message: 'enlace que no es https' }).nullable(),
    location: z.string().nullable(),
    lessonId: z.string().min(1).nullable(),
    originalSessionId: z.string().min(1).nullable(),
    // solo en el aula: la de quien mira; el docente la pasa aparte
    attendance: z.enum(ATTENDANCE_STATUSES).nullish()
  })
  .refine((session) => Date.parse(session.end) > Date.parse(session.start), { message: 'la sesión termina antes de empezar', path: ['end'] })

export const sessionListSchema = z.array(sessionSchema)

export type Session = z.infer<typeof sessionSchema>

// presente o tarde cuentan como asistencia (ADR-0016)
export function attended(status: AttendanceStatus | null | undefined): boolean {
  return status === 'PRESENTE' || status === 'TARDE'
}
