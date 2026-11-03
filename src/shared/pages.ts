import type { ApiClient } from '@wasichai/core'
import type { z } from 'zod'
import { parseContract } from './contract'

// lo que se pide de una vez: el contrato acota size a 1–200
export const PANEL_PAGE_SIZE = 100
// por si un servidor nunca diera una página corta: nadie lleva tantas a la vez, y pasarlo es un fallo, no una lista completa
export const MAX_PANEL_PAGES = 20

interface PagedRead<T> {
  path: string
  schema: z.ZodType<T[]>
  // cómo se nombra el recurso en un error de contrato
  resource: string
  // qué identifica a un elemento: entre dos páginas la lista puede moverse, y uno repetido cuenta una vez
  keyOf: (item: T) => string
  signal?: AbortSignal
}

// todas las páginas, o ningún dato: una página con menos de size es la última, y si una falla, falla todo
export async function fetchAllPages<T>(client: ApiClient, { path, schema, resource, keyOf, signal }: PagedRead<T>): Promise<T[]> {
  const items = new Map<string, T>()
  for (let page = 0; page < MAX_PANEL_PAGES; page++) {
    const body = await client.request<unknown>(`${path}?page=${page}&size=${PANEL_PAGE_SIZE}`, { signal })
    const read = parseContract(schema, resource, body)
    read.forEach((item) => items.set(keyOf(item), item))
    if (read.length < PANEL_PAGE_SIZE) return [...items.values()]
  }
  throw new Error(`${resource}: más de ${MAX_PANEL_PAGES} páginas`)
}
