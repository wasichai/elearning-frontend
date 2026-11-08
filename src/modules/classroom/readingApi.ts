import { useQuery } from '@tanstack/react-query'
import { useApiClient, type ApiClient } from '@wasichai/core'
import { z } from 'zod'
import { retryNetwork } from '../../shared/retry'
import { classroomKeys, enrollmentPath } from './api'
import { parseContract } from './contract'

// la lectura de un recurso HTML del aula como documento de bloques (ADR-0045): «GET …/resources/{id}/reading» en
// docs/api/lms.md del backend. los tipos espejan elearning.media.ReadingDocument. el vocabulario es cerrado y el contenido,
// dato no confiable: lo que no se entiende (un tipo nuevo, un campo que falta) se descarta nodo a nodo, sin romper el resto

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'em' | 'strong'; content: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; content: Inline[] }
  | { type: 'break' }

export const ADMONITION_KINDS = ['note', 'tip', 'important', 'warning', 'caution'] as const
export type AdmonitionKind = (typeof ADMONITION_KINDS)[number]

export interface Cell {
  content: Block[]
  colspan: number
  rowspan: number
  header: boolean
}

export type Block =
  | { type: 'heading'; level: 2 | 3 | 4; id: string | null; content: Inline[] }
  | { type: 'paragraph'; content: Inline[] }
  | { type: 'list'; ordered: boolean; items: Block[][] }
  | { type: 'table'; caption: Inline[] | null; head: Cell[][]; body: Cell[][] }
  | { type: 'code'; language: string | null; text: string }
  | { type: 'quote'; content: Block[]; attribution: Inline[] | null }
  | { type: 'admonition'; kind: AdmonitionKind; content: Block[] }
  | { type: 'figure'; src: string; alt: string; caption: Inline[] | null }
  | { type: 'rule' }

export interface ReadingDocumentDto {
  title: string | null
  blocks: Block[]
}

// una lista que se queda con los elementos que cumplen su esquema; los demás no llegan a la interfaz
function kept<T>(item: () => z.ZodType<T>): z.ZodType<T[]> {
  return z.array(z.unknown()).transform((items) =>
    items.flatMap((value) => {
      const parsed = item().safeParse(value)
      return parsed.success ? [parsed.data] : []
    })
  )
}

const inlines: z.ZodType<Inline[]> = kept(() => inlineSchema)
const blocks: z.ZodType<Block[]> = kept(() => blockSchema)

const inlineSchema: z.ZodType<Inline> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ type: z.enum(['em', 'strong']), content: inlines }),
  z.object({ type: z.literal('code'), text: z.string() }),
  z.object({ type: z.literal('link'), href: z.string(), content: inlines }),
  z.object({ type: z.literal('break') })
])

const cell: z.ZodType<Cell> = z.object({
  content: blocks,
  colspan: z.number().int().min(1).max(1000),
  rowspan: z.number().int().min(1).max(1000),
  header: z.boolean()
})
const rows = kept(() => kept(() => cell))

const blockSchema: z.ZodType<Block> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading'), level: z.union([z.literal(2), z.literal(3), z.literal(4)]), id: z.string().nullable(), content: inlines }),
  z.object({ type: z.literal('paragraph'), content: inlines }),
  z.object({ type: z.literal('list'), ordered: z.boolean(), items: kept(() => blocks) }),
  z.object({ type: z.literal('table'), caption: inlines.nullable(), head: rows, body: rows }),
  z.object({ type: z.literal('code'), language: z.string().nullable(), text: z.string() }),
  z.object({ type: z.literal('quote'), content: blocks, attribution: inlines.nullable() }),
  z.object({ type: z.literal('admonition'), kind: z.enum(ADMONITION_KINDS), content: blocks }),
  z.object({ type: z.literal('figure'), src: z.string(), alt: z.string(), caption: inlines.nullable() }),
  z.object({ type: z.literal('rule') })
])

export const readingDocumentSchema: z.ZodType<ReadingDocumentDto> = z.object({ title: z.string().nullable(), blocks })

export function readingPath(enrollmentId: string, resourceVersionId: string): string {
  return `${enrollmentPath(enrollmentId)}/resources/${encodeURIComponent(resourceVersionId)}/reading`
}

export async function fetchReading(client: ApiClient, enrollmentId: string, resourceVersionId: string, signal?: AbortSignal): Promise<ReadingDocumentDto> {
  const body = await client.request<unknown>(readingPath(enrollmentId, resourceVersionId), { signal })
  return parseContract(readingDocumentSchema, `GET classroom/enrollments/${enrollmentId}/resources/${resourceVersionId}/reading`, body)
}

// una versión publicada no cambia (ADR-0012): leída una vez, sirve mientras dure la página
export function useReading(enrollmentId: string, resourceVersionId: string) {
  const client = useApiClient()
  return useQuery({
    queryKey: classroomKeys.reading(enrollmentId, resourceVersionId),
    queryFn: ({ signal }) => fetchReading(client, enrollmentId, resourceVersionId, signal),
    staleTime: Infinity,
    retry: retryNetwork
  })
}
