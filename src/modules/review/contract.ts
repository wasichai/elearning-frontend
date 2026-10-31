import { z } from 'zod'

export { ContractError, parseContract } from '../../shared/contract'

// el contrato de la bandeja del revisor (F4, ADR-0018): «Estudio y revisión» en docs/api/lms.md del backend. solo lo que
// está en revisión y a cargo de la persona; lo ajeno responde 404. los objetos no son estrictos: un campo nuevo no rompe

// el ciclo editorial de version_curso (model/model.json del backend)
export const VERSION_STATUSES = ['BORRADOR', 'EN_REVISION', 'APROBADA', 'PUBLICADA', 'RETIRADA'] as const
// PEDIR_CAMBIOS devuelve a BORRADOR; RECHAZAR pasa a RETIRADA. el motivo es obligatorio salvo al aprobar
export const DECISIONS = ['APROBAR', 'PEDIR_CAMBIOS', 'RECHAZAR'] as const

const instant = z.iso.datetime({ offset: true })
const count = z.number().int().nonnegative()

export const studioVersionSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  status: z.enum(VERSION_STATUSES),
  course: z.object({ id: z.string().min(1), code: z.string(), title: z.string() }),
  authorId: z.string().nullable(),
  reviewerId: z.string().nullable(),
  updatedAt: instant.nullable(),
  openComments: count
})

export const studioVersionListSchema = z.array(studioVersionSchema)

// section es texto libre que nombra la parte comentada (unidad:1/leccion:2)
export const reviewCommentSchema = z.object({
  id: z.string().min(1),
  section: z.string(),
  text: z.string(),
  authorId: z.string().nullable(),
  createdAt: instant.nullable(),
  resolved: z.boolean()
})

export const reviewDecisionSchema = z.object({
  decision: z.enum(DECISIONS),
  reason: z.string().nullable(),
  authorId: z.string(),
  at: instant
})

const lessonSchema = z.object({
  id: z.string().min(1),
  order: z.number().int(),
  title: z.string(),
  // LECTURA, VIDEO…: vocabulario abierto; la interfaz traduce los conocidos y muestra el resto tal cual
  type: z.string(),
  sourceRef: z.string().nullable(),
  hasAssessment: z.boolean(),
  resources: count
})

export const studioVersionDetailSchema = studioVersionSchema.extend({
  units: z.array(z.object({ id: z.string().min(1), order: z.number().int(), title: z.string(), lessons: z.array(lessonSchema) })),
  comments: z.array(reviewCommentSchema),
  // la más antigua primero
  decisions: z.array(reviewDecisionSchema)
})

export type VersionStatus = (typeof VERSION_STATUSES)[number]
export type Decision = (typeof DECISIONS)[number]
export type StudioVersion = z.infer<typeof studioVersionSchema>
export type StudioVersionDetail = z.infer<typeof studioVersionDetailSchema>
export type StudioUnit = StudioVersionDetail['units'][number]
export type StudioLesson = StudioUnit['lessons'][number]
export type ReviewComment = z.infer<typeof reviewCommentSchema>
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>
