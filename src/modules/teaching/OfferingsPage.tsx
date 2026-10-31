import { LoadingState, PageHeader, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatNumber } from '../../shared/format'
import { ProblemState } from '../../shared/ProblemState'
import { useOfferings } from './api'
import type { TeachingOffering } from './contract'
import { OfferingDates, useProblemText } from './parts'
import { TEACHING_ROUTES } from './routes'

// «Mis ediciones»: las ediciones asignadas a la persona, con sus matriculados y lo que queda por corregir
export function OfferingsPage() {
  const { t } = useTranslation('teaching')
  const query = useOfferings()
  const { title, description } = useProblemText(query.error, 'offerings')
  return (
    <>
      <PageHeader title={t('offerings.title')} subtitle={t('offerings.subtitle')} />
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-8">
        {query.isError ? (
          <ProblemState title={title} description={description}>
            <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
              {t('problem.retry')}
            </Button>
          </ProblemState>
        ) : query.data ? (
          <OfferingList offerings={query.data} />
        ) : (
          <LoadingState label={t('offerings.loading')} />
        )}
      </div>
    </>
  )
}

function OfferingList({ offerings }: { offerings: TeachingOffering[] }) {
  const { t } = useTranslation('teaching')
  // sin asignaciones el menú puede verse igual (core decide la visibilidad solo con permisos): se dice con claridad
  if (offerings.length === 0)
    return (
      <div className="flex max-w-prose flex-col items-start gap-2 py-12">
        <p className="text-base font-semibold text-ink">{t('offerings.empty')}</p>
        <p className="text-sm text-ink-muted">{t('offerings.emptyHint')}</p>
      </div>
    )
  const sorted = [...offerings].sort((a, b) => a.startDate.localeCompare(b.startDate))
  return (
    <ul className="flex flex-col divide-y divide-border">
      {sorted.map((offering) => (
        <li key={offering.code}>
          <OfferingItem offering={offering} />
        </li>
      ))}
    </ul>
  )
}

function OfferingItem({ offering }: { offering: TeachingOffering }) {
  const { t, i18n } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const locale = i18n.language
  return (
    <article aria-labelledby={`offering-${offering.code}`} className="flex flex-col gap-2 py-6">
      <h2 id={`offering-${offering.code}`} className="text-lg font-semibold leading-snug tracking-tight">
        <Link
          to={links.to(TEACHING_ROUTES.roster, { code: offering.code })}
          className="rounded-sm text-ink underline-offset-4 hover:text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {offering.course.title}
        </Link>
      </h2>
      <p className="text-sm text-ink-muted">{t('offerings.code', { course: offering.course.code, offering: offering.code })}</p>
      <OfferingDates offering={offering} />
      <p className="flex flex-wrap gap-x-4 text-sm text-ink">
        <span>{t('offerings.enrolled', { count: offering.enrolled, value: formatNumber(offering.enrolled, locale) })}</span>
        {offering.pendingAttempts > 0 ? (
          <span className="font-medium text-warning">
            {t('offerings.pending', { count: offering.pendingAttempts, value: formatNumber(offering.pendingAttempts, locale) })}
          </span>
        ) : (
          <span className="text-ink-muted">{t('offerings.nothingPending')}</span>
        )}
      </p>
    </article>
  )
}
