import { LoadingState, PageHeader, useWasichaiLinks } from '@wasichai/core'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatInstant, formatNumber } from '../../shared/format'
import { useInbox } from './api'
import type { StudioVersion } from './contract'
import { QueryProblem } from './parts'
import { REVIEW_ROUTES } from './routes'

// la bandeja del revisor: las versiones en revisión a cargo de la persona, la que más espera primero (así las ordena el servidor)
export function InboxPage() {
  const { t } = useTranslation('review')
  const query = useInbox()
  return (
    <>
      <PageHeader title={t('inbox.title')} subtitle={t('inbox.subtitle')} />
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-8">
        {query.isError ? (
          <QueryProblem error={query.error} resource="inbox" onRetry={() => void query.refetch()} />
        ) : query.data ? (
          <VersionList versions={query.data} />
        ) : (
          <LoadingState label={t('inbox.loading')} />
        )}
      </div>
    </>
  )
}

function VersionList({ versions }: { versions: StudioVersion[] }) {
  const { t } = useTranslation('review')
  if (versions.length === 0)
    return (
      <div className="flex max-w-prose flex-col items-start gap-2 py-12">
        <p className="text-base font-semibold text-ink">{t('inbox.empty')}</p>
        <p className="text-sm text-ink-muted">{t('inbox.emptyHint')}</p>
      </div>
    )
  return (
    <ul className="flex flex-col divide-y divide-border">
      {versions.map((version) => (
        <li key={version.id}>
          <VersionItem version={version} />
        </li>
      ))}
    </ul>
  )
}

function VersionItem({ version }: { version: StudioVersion }) {
  const { t, i18n } = useTranslation('review')
  const links = useWasichaiLinks()
  const locale = i18n.language
  const headingId = `version-${version.id}`
  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-2 py-6">
      <h2 id={headingId} className="text-lg font-semibold leading-snug tracking-tight">
        <Link
          to={links.to(REVIEW_ROUTES.version, { versionId: version.id })}
          className="rounded-sm text-ink underline-offset-4 hover:text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {version.course.title}
        </Link>
      </h2>
      <p className="text-sm text-ink-muted">{t('inbox.code', { course: version.course.code, number: version.number })}</p>
      <p className="flex flex-wrap gap-x-4 text-sm text-ink">
        {version.updatedAt ? <span>{t('inbox.waiting', { date: formatInstant(version.updatedAt, locale) })}</span> : null}
        <span className={version.openComments > 0 ? 'font-medium' : 'text-ink-muted'}>
          {version.openComments > 0
            ? t('inbox.openComments', { count: version.openComments, value: formatNumber(version.openComments, locale) })
            : t('inbox.noOpenComments')}
        </span>
        {/* la bandeja solo trae lo mío: con revisor puesto, ese revisor soy yo */}
        {version.reviewerId ? <span className="text-ink-muted">{t('inbox.assigned')}</span> : null}
      </p>
    </article>
  )
}
