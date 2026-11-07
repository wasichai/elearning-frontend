import { ApiError } from '@wasichai/core'
import { CircleAlert } from 'lucide-react'
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

// el dato técnico de un fallo (el estado HTTP): para quien tenga que reportarlo, plegado y fuera de la frase que se lee
export interface ProblemTechnical {
  summary: string
  text: string
}

interface ProblemStateProps {
  title: string
  description?: string
  details?: string[]
  technical?: ProblemTechnical
  children?: ReactNode
}

// un error explicado: qué pasó, qué hacer, y la acción para hacerlo. con icono y palabra: el color nunca va solo
export function ProblemState({ title, description, details = [], technical, children }: ProblemStateProps) {
  return (
    <div role="alert" data-slot="query-state" data-state="error" className="flex max-w-prose gap-3 py-12 text-sm">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger" />
      <div className="flex min-w-0 flex-col items-start gap-3">
        <p className="text-title-3 text-ink">{title}</p>
        {description ? <p className="text-base text-ink-muted">{description}</p> : null}
        {details.length > 0 ? (
          <ul className="list-disc pl-5 text-ink-muted">
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
        {children ? <div className="flex flex-wrap items-center gap-3">{children}</div> : null}
        {technical ? (
          <details className="text-xs text-ink-muted">
            <summary className="cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-focus">{technical.summary}</summary>
            <p className="mt-1 font-mono">{technical.text}</p>
          </details>
        ) : null}
      </div>
    </div>
  )
}
