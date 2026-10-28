import { ApiError } from '@wasichai/core'
import type { ReactNode } from 'react'
import { ContractError } from './contract'

export type ProblemKind = 'invalid' | 'notFound' | 'conflict' | 'refused' | 'server' | 'network' | 'contract'

// qué le pasó a la petición, en términos que la interfaz sabe explicar. solo un 400 (o 422) culpa a los parámetros;
// un 409 es una regla del servidor que no se cumple (inscripción cerrada, lección que no se completa así);
// 401, 403 y el resto de 4xx son el servidor negándose
export function problemKind(error: unknown): ProblemKind {
  if (error instanceof ContractError) return 'contract'
  if (error instanceof ApiError) {
    if (error.status === 400 || error.status === 422) return 'invalid'
    if (error.status === 404) return 'notFound'
    if (error.status === 409) return 'conflict'
    return error.status < 500 ? 'refused' : 'server'
  }
  return error instanceof TypeError ? 'network' : 'server'
}

interface ProblemStateProps {
  title: string
  description?: string
  details?: string[]
  children?: ReactNode
}

// un error explicado: qué pasó, qué hacer, y la acción para hacerlo
export function ProblemState({ title, description, details = [], children }: ProblemStateProps) {
  return (
    <div role="alert" data-slot="query-state" data-state="error" className="flex max-w-prose flex-col items-start gap-3 py-12 text-sm">
      <p className="text-base font-semibold text-ink">{title}</p>
      {description ? <p className="text-ink-muted">{description}</p> : null}
      {details.length > 0 ? (
        <ul className="list-disc pl-5 text-ink-muted">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  )
}
