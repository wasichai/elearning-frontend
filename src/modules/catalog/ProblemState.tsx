import { ApiError } from '@wasichai/core'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ContractError } from './contract'

export type ProblemKind = 'invalid' | 'notFound' | 'server' | 'network' | 'contract'

// qué le pasó a la petición, en términos que la interfaz sabe explicar
export function problemKind(error: unknown): ProblemKind {
  if (error instanceof ContractError) return 'contract'
  if (error instanceof ApiError) return error.status === 404 ? 'notFound' : error.status >= 400 && error.status < 500 ? 'invalid' : 'server'
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
    <div role="alert" data-slot="query-state" data-state="error" className="mx-auto flex max-w-prose flex-col items-start gap-3 py-12 text-sm">
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

// el texto de un error, por tipo; el estado HTTP queda a la vista para quien tenga que reportarlo
export function useProblemText(error: unknown, resource: 'catalog' | 'course') {
  const { t } = useTranslation('catalog')
  const kind = problemKind(error)
  const status = error instanceof ApiError ? error.status : undefined
  return {
    kind,
    title: t(`problem.${resource}.${kind}`),
    // un fallo sin estado HTTP que no es de red ni de contrato: no hay número que citar
    description: t(kind === 'server' && status === undefined ? 'problem.hint.unexpected' : `problem.hint.${kind}`, { status })
  }
}
