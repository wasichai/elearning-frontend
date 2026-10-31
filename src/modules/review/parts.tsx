import { ApiError } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { problemKind, ProblemState } from '../../shared/ProblemState'

// piezas que comparten las páginas de la bandeja del revisor

export type ReviewResource = 'inbox' | 'version'

// un fallo al leer: un 404 es una respuesta (lo ajeno y lo inexistente no se distinguen) y no se reintenta; lo demás, sí.
// el estado HTTP queda a la vista para quien tenga que reportarlo
export function QueryProblem({ error, resource, onRetry }: { error: unknown; resource: ReviewResource; onRetry: () => void }) {
  const { t } = useTranslation('review')
  const kind = problemKind(error)
  const status = error instanceof ApiError ? error.status : undefined
  const title = t(`problem.${resource}.${kind}`)
  if (kind === 'notFound')
    return (
      <div role="alert" className="flex max-w-prose flex-col gap-2 py-6">
        <p className="text-base font-semibold text-ink">{title}</p>
        <p className="text-sm text-ink-muted">{t('problem.notFoundHint')}</p>
      </div>
    )
  const description = t(kind === 'server' && status === undefined ? 'problem.hint.unexpected' : `problem.hint.${kind}`, { status })
  return (
    <ProblemState title={title} description={description}>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {t('problem.retry')}
      </Button>
    </ProblemState>
  )
}

// el texto de un fallo al guardar (RNF-UX-08): el servidor manda, y su ProblemDetail dice qué regla no se cumple o qué
// campos rechazó. un 403 no culpa a los datos; sin conexión se dice así; lo demás deja el estado para reportarlo
export function useActionError() {
  const { t } = useTranslation('review')
  return (error: unknown): string => {
    if (error instanceof TypeError) return t('action.network')
    if (!(error instanceof ApiError)) return t('action.failed')
    if (error.status === 409) return t('action.conflict', { detail: error.message })
    if (error.status === 400 || error.status === 422) return t('action.invalid', { detail: problemDetail(error) })
    if (error.status === 403) return t('action.refused')
    if (error.status === 404) return t('action.notFound')
    return t('action.failedStatus', { status: error.status })
  }
}

// el detalle y cada campo rechazado (errors del problem+json), en una línea
function problemDetail(error: ApiError): string {
  return [error.message, ...error.violations.map((violation) => `${violation.field}: ${violation.message}`)].join(' — ')
}
