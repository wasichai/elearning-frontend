import { ApiError, useWasichaiLinks } from '@wasichai/core'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatCivilRange, timeZoneLabel } from '../../shared/format'
import { problemKind } from '../../shared/ProblemState'
import type { TeachingOffering } from './contract'
import { TEACHING_ROUTES } from './routes'

// piezas que comparten las páginas del espacio docente

export type TeachingResource = 'offerings' | 'roster'

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
