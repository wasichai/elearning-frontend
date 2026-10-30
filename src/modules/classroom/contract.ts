import { z } from 'zod'
import { fileSchema, percentSchema, type FileRef } from '../../shared/attempts'
import { civilDate, ENROLLMENT_STATUSES, ianaTimeZone, OFFERING_STATUSES, progressSummarySchema } from '../../shared/contract'

export {
  ATTEMPT_STATUSES,
  attemptSchema,
  QUESTION_TYPES,
  type Answer,
  type Attempt,
  type AttemptResult,
  type Question,
  type QuestionResult,
  type QuestionType
} from '../../shared/attempts'
export { ContractError, ENROLLMENT_STATUSES, OFFERING_STATUSES, parseContract, progressSummarySchema, type ProgressSummary } from '../../shared/contract'

// el contrato del aula del estudiante (F2, ADR-0012; F3, ADR-0016): «Aula del estudiante» y «Evaluaciones, sesiones y
// certificado del estudiante» en docs/api/lms.md del backend.
// los objetos no son estrictos: un campo nuevo del servidor no rompe la interfaz; uno que falta o cambia de tipo, sí.

// los vocabularios cerrados del contrato y del modelo (model/model.json del backend)
// cómo se completa una lección: la marca el estudiante, al terminar el vídeo, al aprobar su evaluación, al asistir a su
// sesión o todavía no (una evaluación o sesión aún sin definir)
export const COMPLETIONS = ['EXPLICIT', 'VIDEO_END', 'ASSESSMENT', 'ATTENDANCE', 'NOT_YET'] as const
export const PROGRESS_STATUSES = ['NO_INICIADA', 'INICIADA', 'COMPLETADA', 'APROBADA'] as const
export const LESSON_EVENTS = ['STARTED', 'VIDEO_ENDED', 'MARKED_COMPLETE'] as const

export type OfferingStatus = (typeof OFFERING_STATUSES)[number]
export type Completion = (typeof COMPLETIONS)[number]
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number]
export type LessonEventType = (typeof LESSON_EVENTS)[number]

const id = z.string().min(1)
const order = z.number().int()
const instant = z.iso.datetime({ offset: true })

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
  nextLesson: nextLesson.nullable(),
  // F3: el código del certificado, si ya se emitió (la matrícula queda FINALIZADA, en solo lectura)
  certificateCode: z.string().min(1).nullish()
})

export const enrollmentListSchema = z.array(enrollmentSchema)

const resource = z.object({
  id,
  title: z.string(),
  // HTML, PDF, VIDEO… vocabulario abierto: lo que la interfaz no sabe mostrar se ofrece como descarga
  type: z.string(),
  version: z.number().int().positive(),
  file: fileSchema.nullable()
})

// la evaluación de una lección, tal como la ve el estudiante: sus reglas y lo que lleva hecho. best es null sin ningún
// intento enviado; mientras su mejor intento espera corrección, percent y passed son null (como en el resultado)
export const assessmentSummarySchema = z
  .object({
    id,
    title: z.string(),
    maxAttempts: z.number().int().positive(),
    timeLimitMinutes: z.number().int().positive().nullable(),
    passingPercent: percentSchema,
    attemptsUsed: z.number().int().nonnegative(),
    openAttemptId: id.nullable(),
    best: z.object({ percent: percentSchema.nullable(), passed: z.boolean().nullable(), pending: z.boolean() }).nullable()
  })
  .refine((assessment) => assessment.attemptsUsed <= assessment.maxAttempts, { message: 'más intentos usados que permitidos', path: ['attemptsUsed'] })

const lesson = z
  .object({
    id,
    order,
    title: z.string(),
    // LECTURA, VIDEO…: la interfaz traduce los conocidos y muestra el resto tal cual; cómo se completa lo dice completion
    type: z.string(),
    durationMinutes: z.number().nonnegative().nullable(),
    summary: z.string().nullable(),
    completion: z.enum(COMPLETIONS),
    progress: lessonProgressSchema,
    resources: z.array(resource),
    // solo en una lección con evaluación (F3)
    assessment: assessmentSummarySchema.nullish()
  })
  // una lección que se completa al aprobar su evaluación tiene que traerla
  .refine((lesson) => lesson.completion !== 'ASSESSMENT' || lesson.assessment != null, { message: 'lección ASSESSMENT sin evaluación', path: ['assessment'] })

const unit = z.object({
  id,
  order,
  title: z.string(),
  description: z.string().nullable(),
  progress: progressSummarySchema,
  lessons: z.array(lesson)
})

export const classroomSchema = enrollmentSchema.extend({ units: z.array(unit) })

// la entrega de una pregunta FILE: el archivo (null hasta subirlo) se sube con POST uploadUrl y la misma sesión
export const submissionSchema = z.object({ id, file: fileSchema.nullable(), uploadUrl: z.string().min(1) })

export type LessonProgress = z.infer<typeof lessonProgressSchema>
export type Enrollment = z.infer<typeof enrollmentSchema>
export type Classroom = z.infer<typeof classroomSchema>
export type Unit = z.infer<typeof unit>
export type Lesson = z.infer<typeof lesson>
export type Resource = z.infer<typeof resource>
export type ResourceFile = FileRef
export type AssessmentSummary = z.infer<typeof assessmentSummarySchema>
export type Submission = z.infer<typeof submissionSchema>

// la finalización (ADR-0016): las reglas que declara la versión, cada una con si se cumple y su detalle legible
export const COMPLETION_RULES = ['LESSONS', 'ASSESSMENTS', 'ATTENDANCE'] as const

const completionRule = z.object({ rule: z.enum(COMPLETION_RULES), met: z.boolean(), detail: z.string() })

export const completionSchema = z
  .object({ met: z.boolean(), rules: z.array(completionRule) })
  .refine((completion) => completion.met === completion.rules.every((rule) => rule.met), { message: 'met no coincide con sus reglas', path: ['met'] })

// el certificado, congelado al emitirse; lo mismo lo devuelve la emisión que la verificación pública
export const certificateSchema = z.object({
  code: z.string().min(1),
  issuedAt: instant,
  holderName: z.string().min(1),
  course: z.object({ code: z.string(), title: z.string() }),
  version: z.number().int().positive(),
  offering: z.object({ code: z.string(), startDate: civilDate, endDate: civilDate, timeZone: ianaTimeZone }),
  totalHours: z.number().nonnegative(),
  // APROBADO; vocabulario del servidor
  result: z.string(),
  rules: z.array(completionRule)
})

// el nombre para el certificado: de 1 a 120 caracteres (400 si no)
export const HOLDER_NAME_MAX = 120

export type CompletionRule = z.infer<typeof completionRule>
export type CompletionStatus = z.infer<typeof completionSchema>
export type Certificate = z.infer<typeof certificateSchema>
