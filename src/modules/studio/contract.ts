import { z } from 'zod'

export { ContractError, parseContract } from '../../shared/contract'
export { versionDiffSchema, type VersionDiff } from '../../shared/diff'

// el contrato del estudio del creador (F4, ADR-0018): «Estudio del creador» en docs/api/lms.md del backend. solo las
// versiones de quien las escribió; lo demás responde 404. los objetos no son estrictos: un campo nuevo no rompe la interfaz

// los vocabularios del modelo (model/model.json del backend)
export const VERSION_STATUSES = ['BORRADOR', 'EN_REVISION', 'APROBADA', 'PUBLICADA', 'RETIRADA'] as const
export const LESSON_TYPES = ['LECTURA', 'VIDEO', 'PRESENTACION', 'LABORATORIO', 'EVALUACION', 'SESION'] as const
export const REVIEW_DECISIONS = ['APROBAR', 'PEDIR_CAMBIOS', 'RECHAZAR'] as const

const count = z.number().int().nonnegative()
const instant = z.iso.datetime({ offset: true })

export const studioVersionSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  status: z.enum(VERSION_STATUSES),
  course: z.object({ id: z.string().min(1), code: z.string(), title: z.string() }),
  authorId: z.string().nullable(),
  reviewerId: z.string().nullable(),
  updatedAt: instant.nullable(),
  // comentarios de revisión sin resolver
  openComments: count
})

export const studioVersionListSchema = z.array(studioVersionSchema)

const studioLesson = z.object({
  id: z.string().min(1),
  order: z.number().int(),
  title: z.string(),
  type: z.enum(LESSON_TYPES),
  // repo@sha:ruta#ancla de una lección importada
  sourceRef: z.string().nullable(),
  hasAssessment: z.boolean(),
  resources: count
})

const studioUnit = z.object({ id: z.string().min(1), order: z.number().int(), title: z.string(), lessons: z.array(studioLesson) })

export const reviewCommentSchema = z.object({
  id: z.string().min(1),
  section: z.string(),
  text: z.string(),
  authorId: z.string().nullable(),
  createdAt: instant.nullable(),
  resolved: z.boolean()
})

// historial de solo inserción, la más antigua primero; reason es null al aprobar
const reviewDecision = z.object({ decision: z.enum(REVIEW_DECISIONS), reason: z.string().nullable(), authorId: z.string(), at: instant })

export const studioVersionDetailSchema = studioVersionSchema.extend({
  units: z.array(studioUnit),
  comments: z.array(reviewCommentSchema),
  decisions: z.array(reviewDecision)
})

// lo que responde la versión nueva: basta su identidad para abrirla (el servidor puede mandar el detalle entero)
export const newVersionSchema = z.object({ id: z.string().min(1), number: z.number().int().positive(), status: z.enum(VERSION_STATUSES) })

export type VersionStatus = (typeof VERSION_STATUSES)[number]
export type StudioVersion = z.infer<typeof studioVersionSchema>
export type StudioVersionDetail = z.infer<typeof studioVersionDetailSchema>
export type StudioUnit = z.infer<typeof studioUnit>
export type StudioLesson = z.infer<typeof studioLesson>
export type ReviewComment = z.infer<typeof reviewCommentSchema>
export type ReviewDecision = z.infer<typeof reviewDecision>
export type NewVersion = z.infer<typeof newVersionSchema>
