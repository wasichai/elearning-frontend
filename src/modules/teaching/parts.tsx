import { ApiError, PageHeader, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatCivilRange, timeZoneLabel } from '../../shared/format'
import { problemKind, ProblemState } from '../../shared/ProblemState'
import { useOfferings } from './api'
import type { TeachingOffering } from './contract'
import { TEACHING_ROUTES } from './routes'

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

// las fechas de la edición son fechas civiles de su zona: se escriben en esa zona y se dice cuál es
export function OfferingDates({ offering }: { offering: Pick<TeachingOffering, 'startDate' | 'endDate' | 'timeZone' | 'status'> }) {
  const { t, i18n } = useTranslation('teaching')
  const locale = i18n.language
  return (
    <p className="flex flex-wrap gap-x-2 text-sm text-ink-muted">
      <span>
        <span className="text-ink">{formatCivilRange(offering.startDate, offering.endDate, offering.timeZone, locale)}</span>
        <span> · {t(`offering.status.${offering.status}`)}</span>
      </span>
      <span className="text-xs leading-5">{t('offering.timeZone', { zone: timeZoneLabel(offering.timeZone, locale) })}</span>
    </p>
  )
}

export function BackToOfferings() {
  const { t } = useTranslation('teaching')
  const links = useWasichaiLinks()
  return (
    <Link to={links.to(TEACHING_ROUTES.offerings)} className="text-sm text-link underline-offset-4 hover:underline">
      {t('offerings.back')}
    </Link>
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
