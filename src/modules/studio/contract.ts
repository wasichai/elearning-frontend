import { z } from 'zod'

export { ContractError, parseContract } from '../../shared/contract'
export { versionDiffSchema, type VersionDiff } from '../../shared/diff'

// el contrato del estudio del creador (F4, ADR-0018): «Estudio del creador» en docs/api/lms.md del backend. solo las
// versiones de quien las escribió; lo demás responde 404. los objetos no son estrictos: un campo nuevo no rompe la interfaz

// los vocabularios del modelo (model/model.json del backend)
export const VERSION_STATUSES = ['BORRADOR', 'EN_REVISION', 'APROBADA', 'PUBLICADA', 'RETIRADA'] as const
// quién generó el borrador de una versión (#288): un proveedor de IA o el doble determinista; null, una persona
export const GENERATORS = ['MODEL', 'DETERMINISTIC'] as const
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
  openComments: count,
  // un backend anterior no lo manda: escrita a mano
  generator: z.enum(GENERATORS).nullable().default(null)
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

// las versiones de un curso por la API de registros de Wasichai: solo importa si hay alguna
export const versionRecordPageSchema = z.object({ content: z.array(z.object({ id: z.string().min(1) })) })

// vacía es sin ninguna lección, tenga o no unidades: no se puede enviar a revisión
export const hasLessons = (version: { units: { lessons: unknown[] }[] }) => version.units.some((unit) => unit.lessons.length > 0)

export type VersionStatus = (typeof VERSION_STATUSES)[number]
export type StudioVersion = z.infer<typeof studioVersionSchema>
export type StudioVersionDetail = z.infer<typeof studioVersionDetailSchema>
export type StudioUnit = z.infer<typeof studioUnit>
export type StudioLesson = z.infer<typeof studioLesson>
export type ReviewComment = z.infer<typeof reviewCommentSchema>
export type ReviewDecision = z.infer<typeof reviewDecision>
export type NewVersion = z.infer<typeof newVersionSchema>

// la importación de un manual AsciiDoc a un borrador («Importación» en docs/api/lms.md del backend, ADR-0018 §5)
export const IMPORT_STATUSES = ['PENDIENTE', 'EN_CURSO', 'HECHO', 'FALLIDO'] as const
export const IMPORT_PROBLEM_KINDS = [
  'MISSING_INCLUDE',
  'INCLUDE_OUTSIDE_ROOT',
  'INCLUDE_CYCLE',
  'INCLUDE_TOO_DEEP',
  'UNRESOLVED_ATTRIBUTE',
  'UNSUPPORTED_INCLUDE_OPTION',
  'MISSING_IMAGE',
  'IMAGE_OUTSIDE_ROOT',
  'BROKEN_REFERENCE',
  'DUPLICATE_ANCHOR',
  'FILE_TOO_LARGE'
] as const
// GAP: esa parte del manual no se leyó y al temario le pueden faltar unidades o lecciones. CHECK: se leyó; queda algo que revisar
export const IMPORT_SEVERITIES = ['GAP', 'CHECK'] as const
// el servidor guarda el sha en minúsculas y exige los 40 caracteres
export const SHA_PATTERN = /^[0-9a-f]{40}$/

// sha null: cualquier commit del repositorio
export const importSourceSchema = z.object({ repository: z.string().regex(/^[^/\s@:]+\/[^/\s@:]+$/), sha: z.string().regex(SHA_PATTERN).nullable() })
export const importSourceListSchema = z.array(importSourceSchema)

// line 0 es el archivo entero. la gravedad la decide el servidor, también para «cualquier tipo nuevo»: por eso kind es texto, y
// IMPORT_PROBLEM_KINDS solo dice cuáles tienen nombre propio en la interfaz
const importProblem = z.object({ kind: z.string().min(1), origin: z.string(), line: count, detail: z.string(), severity: z.enum(IMPORT_SEVERITIES) })

export const importReportSchema = z.object({
  source: z.string(),
  files: count,
  includes: count,
  sections: count,
  images: count,
  units: count,
  lessons: count,
  // todos los encontrados; problems trae a lo sumo 500
  problemCount: count,
  problems: z.array(importProblem),
  // cuenta todos, también los que problems no trae
  problemsBySeverity: z.object({ GAP: count, CHECK: count })
})

export const importJobSchema = z.object({
  id: z.string().min(1),
  status: z.enum(IMPORT_STATUSES),
  // el motivo de FALLIDO, o el último fallo pasajero mientras se reintenta
  error: z.string().nullable(),
  versionId: z.string().min(1).nullable(),
  report: importReportSchema.nullable(),
  // lo pedido: owner/repo@sha:ruta y el curso
  source: z.string().min(1),
  courseId: z.string().min(1),
  createdAt: instant,
  finishedAt: instant.nullable()
})

// a lo sumo 50, de quien llama, el más reciente primero: pendientes, en curso y terminados aún retenidos
export const importJobListSchema = z.array(importJobSchema)

// los cursos que la persona puede leer, por la API de registros de Wasichai (objeto curso de model/model.json)
export const courseRecordPageSchema = z.object({
  content: z.array(z.object({ id: z.string().min(1), attributes: z.object({ codigo: z.string().nullish(), titulo: z.string().nullish() }) }))
})

export type ImportStatus = (typeof IMPORT_STATUSES)[number]
export type ImportProblemKind = (typeof IMPORT_PROBLEM_KINDS)[number]
export type ImportSeverity = (typeof IMPORT_SEVERITIES)[number]
export type ImportSource = z.infer<typeof importSourceSchema>
export type ImportReport = z.infer<typeof importReportSchema>
export type ImportProblem = z.infer<typeof importProblem>
export type ImportJob = z.infer<typeof importJobSchema>
