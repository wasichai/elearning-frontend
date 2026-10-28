import { z } from 'zod'

// el contrato v1 de la API pública del catálogo (GET /lms/public/catalog/…), tal como lo publica el backend.
// los objetos no son estrictos: un campo nuevo del servidor no rompe la interfaz; uno que falta o cambia de tipo, sí.

export const LEVELS = ['INICIAL', 'INTERMEDIO', 'AVANZADO'] as const
export const MODALITIES = ['ASINCRONA', 'SINCRONA', 'HIBRIDA'] as const
export const SORTS = ['upcoming', 'title', 'duration'] as const
export const OFFERING_STATUSES = ['PROGRAMADA', 'INSCRIPCION_ABIERTA', 'EN_CURSO'] as const
export const CREDIT_SYSTEMS = ['ECTS', 'SCH'] as const

export type Level = (typeof LEVELS)[number]
export type Modality = (typeof MODALITIES)[number]
export type Sort = (typeof SORTS)[number]

// una zona que Intl no conoce haría fallar el formateo de fechas al pintar: se rechaza aquí, con el resto del contrato
const timeZone = z.string().refine(
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
const civilDate = z.iso.date()
const hours = z.number().nonnegative()
const lines = z.array(z.string())

const category = z.object({ slug: z.string(), name: z.string() })

const summaryWorkload = z.object({ totalHours: hours, contactHours: hours, autonomousHours: hours })

const nextOffering = z.object({
  code: z.string(),
  status: z.enum(OFFERING_STATUSES),
  startDate: civilDate,
  endDate: civilDate,
  timeZone,
  enrollmentOpen: z.boolean()
})

const courseBase = z.object({
  slug: z.string().min(1),
  code: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  language: z.string(),
  level: z.enum(LEVELS),
  modality: z.enum(MODALITIES),
  category: category.nullable(),
  weeks: z.number().int().nonnegative(),
  illustrative: z.boolean()
})

export const courseSummarySchema = courseBase.extend({ workload: summaryWorkload, nextOffering: nextOffering.nullable() })

export const coursePageSchema = z.object({
  content: z.array(courseSummarySchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  facets: z.object({ categories: z.array(category.extend({ count: z.number().int().nonnegative() })) })
})

const weeklyHours = z.object({ theory: hours, practice: hours, supervised: hours, autonomous: hours })

const detailWorkload = z.object({
  weeks: z.number().int().nonnegative(),
  weekly: weeklyHours,
  theoryHours: hours,
  practiceHours: hours,
  supervisedHours: hours,
  autonomousHours: hours,
  contactHours: hours,
  directedHours: hours,
  totalHours: hours
})

const creditSystem = z.enum(CREDIT_SYSTEMS)

const creditProposal = z.object({
  system: creditSystem,
  policyId: z.string(),
  policyVersion: z.string(),
  method: z.string(),
  parameters: z.record(z.string(), z.union([z.string(), z.number()])),
  source: z.string(),
  totalHours: hours,
  calculated: z.number().nonnegative(),
  proposed: z.number().nonnegative(),
  warnings: z.array(z.string()),
  status: z.string()
})

// sistema null (NINGUNO) va sin propuesta; con sistema, la propuesta es del mismo sistema
const credits = z
  .object({ system: creditSystem.nullable(), approved: z.number().nonnegative().nullable(), proposal: creditProposal.nullable() })
  .refine((value) => (value.system === null ? value.proposal === null : value.proposal?.system === value.system), {
    message: 'la propuesta de créditos no corresponde al sistema',
    path: ['proposal']
  })

const lesson = z.object({
  order: z.number().int(),
  title: z.string(),
  // tipo y rol son vocabularios abiertos del modelo: la interfaz traduce los conocidos y muestra el resto tal cual
  type: z.string(),
  durationMinutes: z.number().nonnegative().nullable(),
  summary: z.string().nullable(),
  source: z.string().nullable()
})

const unit = z.object({
  order: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  objectives: lines,
  estimatedHours: hours.nullable(),
  lessons: z.array(lesson)
})

const offeringTeacher = z.object({ name: z.string(), professionalTitle: z.string().nullable(), role: z.string() })

const offering = z.object({
  code: z.string(),
  status: z.enum(OFFERING_STATUSES),
  startDate: civilDate,
  endDate: civilDate,
  timeZone,
  enrollmentFrom: civilDate.nullable(),
  enrollmentUntil: civilDate.nullable(),
  enrollmentOpen: z.boolean(),
  capacity: z.number().int().positive().nullable(),
  schedule: z.string().nullable(),
  teachers: z.array(offeringTeacher)
})

const teacher = z.object({
  name: z.string(),
  professionalTitle: z.string().nullable(),
  bio: z.string().nullable(),
  specialties: z.string().nullable()
})

export const courseDetailSchema = courseBase.extend({
  prerequisiteKnowledge: z.string().nullable(),
  version: z.object({ number: z.number().int().positive(), publishedAt: z.iso.datetime().nullable() }),
  objectives: lines,
  learningOutcomes: lines,
  requirements: z.string().nullable(),
  assessment: z.string().nullable(),
  certification: z.string().nullable(),
  sources: lines,
  workload: detailWorkload,
  credits,
  units: z.array(unit),
  offerings: z.array(offering),
  teachers: z.array(teacher)
})

export type CourseSummary = z.infer<typeof courseSummarySchema>
export type CoursePage = z.infer<typeof coursePageSchema>
export type CourseDetail = z.infer<typeof courseDetailSchema>
export type NextOffering = z.infer<typeof nextOffering>
export type Offering = z.infer<typeof offering>
export type Credits = z.infer<typeof credits>

// la respuesta llegó (2xx) pero no cumple el contrato: un desajuste entre versiones de API e interfaz, no un fallo del usuario
export class ContractError extends Error {
  readonly resource: string

  constructor(resource: string, error: z.ZodError) {
    super(`la respuesta de ${resource} no cumple el contrato del catálogo:\n${z.prettifyError(error)}`)
    this.name = 'ContractError'
    this.resource = resource
  }
}

export function parseContract<T>(schema: z.ZodType<T>, resource: string, body: unknown): T {
  const result = schema.safeParse(body)
  if (!result.success) throw new ContractError(resource, result.error)
  return result.data
}
