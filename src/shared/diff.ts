import { z } from 'zod'

// las diferencias de una versión con la anterior del mismo curso (VersionDiff en docs/api/lms.md del backend), que leen
// el estudio del creador y la bandeja del revisor. una unidad es la misma si tiene el mismo order; una lección, si tiene
// el mismo order dentro de su unidad. los objetos no son estrictos: un campo nuevo no rompe la interfaz

export const DIFF_CHANGES = ['ADDED', 'REMOVED', 'CHANGED', 'SAME'] as const

// title es null en lo quitado y previousTitle en lo añadido; fields nombra los campos del modelo que difieren (en
// español, con recursos si cambian los enlazados) y va vacío en ADDED y REMOVED
const diffItem = z.object({
  order: z.number().int(),
  change: z.enum(DIFF_CHANGES),
  title: z.string().nullable(),
  previousTitle: z.string().nullable(),
  fields: z.array(z.string())
})

export const versionDiffSchema = z.object({
  // el number de la versión anterior; null si no la hay, y entonces todo es ADDED
  baseVersion: z.number().int().positive().nullable(),
  units: z.array(diffItem.extend({ lessons: z.array(diffItem) }))
})

export type DiffChange = (typeof DIFF_CHANGES)[number]
export type VersionDiff = z.infer<typeof versionDiffSchema>
export type UnitDiff = VersionDiff['units'][number]
export type LessonDiff = UnitDiff['lessons'][number]
