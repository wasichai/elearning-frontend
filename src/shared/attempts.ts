import { z } from 'zod'

// el intento de una evaluación (F3, ADR-0016), como lo leen el estudiante y su docente: la instantánea de sus preguntas,
// las respuestas y, tras enviar, el resultado. «Intentos» en docs/api/lms.md del backend

const id = z.string().min(1)
const order = z.number().int()
const instant = z.iso.datetime({ offset: true })

// porcentaje de 0 a 100 (notas: no tiene por qué ser entero)
export const percentSchema = z.number().min(0).max(100)

// un archivo de wasichai-files, que se baja con la misma sesión (src/shared/files.ts)
export const fileSchema = z.object({
  name: z.string(),
  contentType: z.string(),
  size: z.number().int().nonnegative(),
  url: z.string().min(1)
})

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

// sin respuesta: optionIds vacío y text y submissionId null. submission (la entrega con su archivo) la añadió el backend
// para el estudiante y el docente; puede faltar o ser null
const answer = z.object({
  questionId: id,
  optionIds: z.array(id),
  text: z.string().nullable(),
  submissionId: id.nullable(),
  submission: z.object({ id, file: fileSchema.nullable() }).nullish()
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
    percent: percentSchema.nullable(),
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

export type FileRef = z.infer<typeof fileSchema>
export type Attempt = z.infer<typeof attemptSchema>
export type Question = z.infer<typeof question>
export type Answer = z.infer<typeof answer>
export type AttemptResult = z.infer<typeof attemptResult>
export type QuestionResult = z.infer<typeof questionResult>
