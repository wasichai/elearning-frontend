import { ApiError, PageHeader } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { CircleAlert } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { problemKind, ProblemState } from '../../shared/ProblemState'
import { StatusBadge, type StatusState } from '../../shared/StatusBadge'
import { useOfferings } from './api'
import type { TeachingOffering } from './contract'

// piezas que comparten las páginas del espacio docente

export type TeachingResource = 'offerings' | 'roster' | 'queue' | 'attempt' | 'sessions' | 'attendance'

// el texto de un error, por tipo; el estado HTTP queda a la vista para quien tenga que reportarlo
export function useProblemText(error: unknown, resource: TeachingResource) {
  const { t } = useTranslation('teaching')
  const kind = problemKind(error)
  const status = error instanceof ApiError ? error.status : undefined
  return {
    kind,
    title: t(`problem.${resource}.${kind}`),
    description: t(kind === 'server' && status === undefined ? 'problem.hint.unexpected' : `problem.hint.${kind}`, { status })
  }
}

const OFFERING_STATE: Record<TeachingOffering['status'], StatusState> = {
  PROGRAMADA: 'todo',
  INSCRIPCION_ABIERTA: 'todo',
  EN_CURSO: 'active',
  FINALIZADA: 'done',
  CANCELADA: 'neutral'
}

export function OfferingStatusBadge({ status }: { status: TeachingOffering['status'] }) {
  const { t } = useTranslation('teaching')
  return <StatusBadge state={OFFERING_STATE[status]}>{t(`offering.status.${status}`)}</StatusBadge>
}

// un correo largo no se parte por cualquier letra: tras la arroba y antes de cada punto. <wbr> no cambia su texto, ni lo que se
// lee ni lo que se copia. overflow-wrap: anywhere, por si un trozo aún no cabe
export function EmailText({ email }: { email: string }) {
  const pieces = email.split(/(?<=@)|(?=\.)/)
  return (
    <span className="[overflow-wrap:anywhere]">
      {pieces.map((piece, index) => (
        <Fragment key={`${piece}-${index}`}>
          {index > 0 ? <wbr /> : null}
          {piece}
        </Fragment>
      ))}
    </span>
  )
}

const BACK_LINK = 'self-start text-sm text-link underline-offset-4 hover:underline'

// el marco de una página dentro de una edición: el curso, qué página es y la vuelta a la página de la que cuelga
export function OfferingFrame({
  code,
  subtitle,
  back,
  backLabel,
  children
}: {
  code: string
  subtitle: string
  back: string
  backLabel: string
  children: ReactNode
}) {
  const { t } = useTranslation('teaching')
  const offering = useOfferings().data?.find((candidate) => candidate.code === code)
  return (
    <>
      <PageHeader title={offering?.course.title ?? t('roster.title')} subtitle={subtitle} />
      <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 pt-6 pb-16 sm:px-8">
        <Link to={back} className={BACK_LINK}>
          {backLabel}
        </Link>
        {children}
      </div>
    </>
  )
}

// un fallo al leer: un 404 es una respuesta (lo ajeno y lo inexistente no se distinguen) y no se reintenta; lo demás, sí
export function QueryProblem({ error, resource, onRetry }: { error: unknown; resource: TeachingResource; onRetry: () => void }) {
  const { t } = useTranslation('teaching')
  const { kind, title, description } = useProblemText(error, resource)
  if (kind === 'notFound')
    return (
      <div role="alert" className="flex max-w-prose flex-col gap-2 py-6">
        <p className="text-base font-semibold text-ink">{title}</p>
        <p className="text-sm text-ink-muted">{t('problem.notFoundHint')}</p>
      </div>
    )
  return (
    <ProblemState title={title} description={description}>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {t('problem.retry')}
      </Button>
    </ProblemState>
  )
}

// un bloque de una pantalla que no se pudo leer: lo dice ahí mismo y deja reintentar, sin tirar el resto de la pantalla
export function BlockProblem({ text, retryLabel, onRetry }: { text: string; retryLabel: string; onRetry: () => void }) {
  const { t } = useTranslation('teaching')
  return (
    <div role="alert" className="flex gap-2 text-sm">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
      <div className="flex min-w-0 flex-col items-start gap-2">
        <p className="text-ink">{text}</p>
        <Button variant="secondary" className="min-h-11" aria-label={retryLabel} onClick={onRetry}>
          {t('problem.retry')}
        </Button>
      </div>
    </div>
  )
}

// el texto de un fallo al guardar (RNF-UX-08): el servidor manda, y su ProblemDetail dice qué regla no se cumple o qué
// campos rechazó. un 403 no culpa a los datos; sin conexión se dice así; lo demás deja el estado para reportarlo
export function useActionError() {
  const { t } = useTranslation('teaching')
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
