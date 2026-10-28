import { z } from 'zod'
import { civilDate, ianaTimeZone } from '../../shared/contract'

export { ContractError, parseContract } from '../../shared/contract'

// el contrato del aula del estudiante (F2, ADR-0012): «Aula del estudiante» en docs/api/lms.md del backend.
// los objetos no son estrictos: un campo nuevo del servidor no rompe la interfaz; uno que falta o cambia de tipo, sí.

// los vocabularios cerrados del contrato y del modelo (model/model.json del backend)
export const ENROLLMENT_STATUSES = ['ACTIVA', 'RETIRADA', 'FINALIZADA'] as const
export const OFFERING_STATUSES = ['PROGRAMADA', 'INSCRIPCION_ABIERTA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA'] as const
// cómo se completa una lección: la marca el estudiante, al terminar el vídeo o, en F2, todavía no
export const COMPLETIONS = ['EXPLICIT', 'VIDEO_END', 'NOT_YET'] as const
export const PROGRESS_STATUSES = ['NO_INICIADA', 'INICIADA', 'COMPLETADA', 'APROBADA'] as const
export const LESSON_EVENTS = ['STARTED', 'VIDEO_ENDED', 'MARKED_COMPLETE'] as const

export type OfferingStatus = (typeof OFFERING_STATUSES)[number]
export type Completion = (typeof COMPLETIONS)[number]
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number]
export type LessonEventType = (typeof LESSON_EVENTS)[number]

const id = z.string().min(1)
const order = z.number().int()
const instant = z.iso.datetime({ offset: true })

// lecciones completadas sobre las que se pueden completar en F2; percent es entero 0–100
export const progressSummarySchema = z
  .object({
    completedLessons: z.number().int().nonnegative(),
    totalLessons: z.number().int().nonnegative(),
    percent: z.number().int().min(0).max(100)
  })
  .refine((progress) => progress.completedLessons <= progress.totalLessons, { message: 'más lecciones completadas que lecciones', path: ['completedLessons'] })

// completada o, desde F3, aprobada: no queda nada por hacer en la lección
export function isDone(status: ProgressStatus): boolean {
  return status === 'COMPLETADA' || status === 'APROBADA'
}

// el progreso de una lección. las marcas de tiempo y la evidencia faltan (o son null) mientras no hay nada que contar;
// la evidencia solo acompaña a una lección completada
export const lessonProgressSchema = z
  .object({
    status: z.enum(PROGRESS_STATUSES),
    startedAt: instant.nullish(),
    completedAt: instant.nullish(),
    // vocabulario abierto del servidor (FINALIZACION_EXPLICITA, …): la interfaz no lo interpreta
    evidence: z.string().nullish()
  })
  .refine((progress) => isDone(progress.status) || progress.evidence == null, { message: 'evidencia en una lección no completada', path: ['evidence'] })

const course = z.object({ slug: z.string().min(1), code: z.string(), title: z.string() })

const offering = z.object({
  code: z.string(),
  status: z.enum(OFFERING_STATUSES),
  startDate: civilDate,
  endDate: civilDate,
  timeZone: ianaTimeZone
})

const nextLesson = z.object({ id, title: z.string(), unitOrder: order, lessonOrder: order })

export const enrollmentSchema = z.object({
  id,
  status: z.enum(ENROLLMENT_STATUSES),
  enrolledAt: instant,
  course,
  version: z.number().int().positive(),
  offering,
  progress: progressSummarySchema,
  nextLesson: nextLesson.nullable()
})

export const enrollmentListSchema = z.array(enrollmentSchema)

// la descarga de wasichai-files con la misma sesión. file es null en un recurso sin archivo
const file = z.object({
  name: z.string(),
  contentType: z.string(),
  size: z.number().int().nonnegative(),
  url: z.string().min(1)
})

const resource = z.object({
  id,
  title: z.string(),
  // HTML, PDF, VIDEO… vocabulario abierto: lo que la interfaz no sabe mostrar se ofrece como descarga
  type: z.string(),
  version: z.number().int().positive(),
  file: file.nullable()
})

const lesson = z.object({
  id,
  order,
  title: z.string(),
  // LECTURA, VIDEO…: la interfaz traduce los conocidos y muestra el resto tal cual; cómo se completa lo dice completion
  type: z.string(),
  durationMinutes: z.number().nonnegative().nullable(),
  summary: z.string().nullable(),
  completion: z.enum(COMPLETIONS),
  progress: lessonProgressSchema,
  resources: z.array(resource)
})

const unit = z.object({
  id,
  order,
  title: z.string(),
  description: z.string().nullable(),
  progress: progressSummarySchema,
  lessons: z.array(lesson)
})

export const classroomSchema = enrollmentSchema.extend({ units: z.array(unit) })

export type ProgressSummary = z.infer<typeof progressSummarySchema>
export type LessonProgress = z.infer<typeof lessonProgressSchema>
export type Enrollment = z.infer<typeof enrollmentSchema>
export type Classroom = z.infer<typeof classroomSchema>
export type Unit = z.infer<typeof unit>
export type Lesson = z.infer<typeof lesson>
export type Resource = z.infer<typeof resource>
export type ResourceFile = z.infer<typeof file>
