import { z } from 'zod'
import { civilDate, ianaTimeZone } from '../../shared/contract'

export { ContractError, parseContract } from '../../shared/contract'

// el contrato del aula del estudiante (F2, ADR-0012; F3, ADR-0016): «Aula del estudiante» y «Evaluaciones, sesiones y
// certificado del estudiante» en docs/api/lms.md del backend.
// los objetos no son estrictos: un campo nuevo del servidor no rompe la interfaz; uno que falta o cambia de tipo, sí.

// los vocabularios cerrados del contrato y del modelo (model/model.json del backend)
export const ENROLLMENT_STATUSES = ['ACTIVA', 'RETIRADA', 'FINALIZADA'] as const
export const OFFERING_STATUSES = ['PROGRAMADA', 'INSCRIPCION_ABIERTA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA'] as const
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
  nextLesson: nextLesson.nullable(),
  // F3: el código del certificado, si ya se emitió (la matrícula queda FINALIZADA, en solo lectura)
  certificateCode: z.string().min(1).nullish()
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

// porcentaje de 0 a 100 (notas: no tiene por qué ser entero)
const percent = z.number().min(0).max(100)

// la evaluación de una lección, tal como la ve el estudiante: sus reglas y lo que lleva hecho. best es null sin ningún
// intento enviado; mientras su mejor intento espera corrección, percent y passed son null (como en el resultado)
export const assessmentSummarySchema = z
  .object({
    id,
    title: z.string(),
    maxAttempts: z.number().int().positive(),
    timeLimitMinutes: z.number().int().positive().nullable(),
    passingPercent: percent,
    attemptsUsed: z.number().int().nonnegative(),
    openAttemptId: id.nullable(),
    best: z.object({ percent: percent.nullable(), passed: z.boolean().nullable(), pending: z.boolean() }).nullable()
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

// los intentos de una evaluación (F3, ADR-0016): la instantánea de sus preguntas, las respuestas y, tras enviar, el resultado
export const QUESTION_TYPES = ['SINGLE', 'MULTIPLE', 'TRUE_FALSE', 'SHORT', 'OPEN', 'FILE'] as const
export const ATTEMPT_STATUSES = ['OPEN', 'SUBMITTED', 'GRADED'] as const

export type QuestionType = (typeof QUESTION_TYPES)[number]

const points = z.number().nonnegative()

const question = z
  .object({
    id,
    order,
    type: z.enum(QUESTION_TYPES),
    prompt: z.string(),
    points,
    options: z.array(z.object({ id, text: z.string() })),
    // solo en OPEN y FILE: con qué se corrige
    rubric: z.array(z.object({ description: z.string(), points }))
  })
  .refine((question) => question.type !== 'TRUE_FALSE' || question.options.length === 2, { message: 'verdadero/falso sin dos opciones', path: ['options'] })

// la entrega de una pregunta FILE: el archivo (null hasta subirlo) se sube con POST uploadUrl y la misma sesión
export const submissionSchema = z.object({ id, file: file.nullable(), uploadUrl: z.string().min(1) })

// sin respuesta: optionIds vacío y text y submissionId null. submission (la entrega con su archivo) la añadió el backend
// para el estudiante y el docente; puede faltar o ser null
const answer = z.object({
  questionId: id,
  optionIds: z.array(id),
  text: z.string().nullable(),
  submissionId: id.nullable(),
  submission: z.object({ id, file: file.nullable() }).nullish()
})

// la solución solo llega si la evaluación las muestra al enviar (o al docente)
const solution = z.object({ optionIds: z.array(id), acceptedAnswers: z.array(z.string()) })

// los puntos y si es correcta faltan (null) en una pregunta que aún espera corrección manual
const questionResult = z.object({
  questionId: id,
  points: points.nullable(),
  maxPoints: points,
  correct: z.boolean().nullable(),
  comment: z.string().nullable(),
  solution: solution.nullable()
})

const attemptResult = z
  .object({
    score: points,
    maxScore: points,
    percent: percent.nullable(),
    passed: z.boolean().nullable(),
    pending: z.boolean(),
    questions: z.array(questionResult)
  })
  .refine((result) => result.pending || (result.percent !== null && result.passed !== null), { message: 'resultado sin nota ni pendiente', path: ['percent'] })

export const attemptSchema = z
  .object({
    id,
    number: z.number().int().positive(),
    status: z.enum(ATTEMPT_STATUSES),
    startedAt: instant,
    // null sin tiempo límite
    deadline: instant.nullable(),
    submittedAt: instant.nullable(),
    questions: z.array(question),
    answers: z.array(answer),
    result: attemptResult.nullable()
  })
  // mientras está abierto no hay soluciones ni puntos ganados; enviado, siempre trae su resultado
  .refine((attempt) => (attempt.status === 'OPEN') === (attempt.result === null), {
    message: 'resultado en un intento abierto o enviado sin él',
    path: ['result']
  })

export type ProgressSummary = z.infer<typeof progressSummarySchema>
export type LessonProgress = z.infer<typeof lessonProgressSchema>
export type Enrollment = z.infer<typeof enrollmentSchema>
export type Classroom = z.infer<typeof classroomSchema>
export type Unit = z.infer<typeof unit>
export type Lesson = z.infer<typeof lesson>
export type Resource = z.infer<typeof resource>
export type ResourceFile = z.infer<typeof file>
export type AssessmentSummary = z.infer<typeof assessmentSummarySchema>
export type Attempt = z.infer<typeof attemptSchema>
export type Question = z.infer<typeof question>
export type Answer = z.infer<typeof answer>
export type AttemptResult = z.infer<typeof attemptResult>
export type QuestionResult = z.infer<typeof questionResult>
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
