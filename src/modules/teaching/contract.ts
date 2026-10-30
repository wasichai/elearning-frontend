import { z } from 'zod'
import { civilDate, ENROLLMENT_STATUSES, ianaTimeZone, OFFERING_STATUSES, progressSummarySchema } from '../../shared/contract'

export { ContractError, parseContract } from '../../shared/contract'

// el contrato del espacio docente (F3, ADR-0016): «Espacio docente» en docs/api/lms.md del backend. solo las ediciones
// asignadas a la persona; lo demás responde 404. los objetos no son estrictos: un campo nuevo no rompe la interfaz

const count = z.number().int().nonnegative()
const percent = z.number().min(0).max(100)

export const teachingOfferingSchema = z.object({
  code: z.string().min(1),
  status: z.enum(OFFERING_STATUSES),
  startDate: civilDate,
  endDate: civilDate,
  timeZone: ianaTimeZone,
  course: z.object({ slug: z.string().min(1), code: z.string(), title: z.string() }),
  enrolled: count,
  pendingAttempts: count
})

export const teachingOfferingListSchema = z.array(teachingOfferingSchema)

// el mejor intento de cada evaluación de un matriculado: sin intentos o pendiente de corrección, bestPercent y passed son null
const rosterAssessment = z.object({
  lessonId: z.string().min(1),
  title: z.string(),
  bestPercent: percent.nullable(),
  passed: z.boolean().nullable(),
  pending: z.boolean()
})

export const rosterEntrySchema = z.object({
  enrollmentId: z.string().min(1),
  // null en una matrícula anterior a que se guardara el correo del estudiante
  email: z.string().nullable(),
  status: z.enum(ENROLLMENT_STATUSES),
  progress: progressSummarySchema,
  attendance: z
    .object({ attended: count, total: count })
    .refine((attendance) => attendance.attended <= attendance.total, { message: 'más asistencias que sesiones', path: ['attended'] }),
  assessments: z.array(rosterAssessment)
})

export const rosterSchema = z.array(rosterEntrySchema)

export type TeachingOffering = z.infer<typeof teachingOfferingSchema>
export type RosterEntry = z.infer<typeof rosterEntrySchema>
export type RosterAssessment = z.infer<typeof rosterAssessment>
