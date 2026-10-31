import { LoadingState, PageHeader, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatInstant, formatNumber } from '../../shared/format'
import { ProblemState } from '../../shared/ProblemState'
import { useVersions } from './api'
import type { StudioVersion } from './contract'
import { ImportLink } from './ImportLink'
import { useProblemText } from './parts'
import { STUDIO_ROUTES } from './routes'

// «Mis versiones»: las versiones de curso que escribió la persona, las más recientes primero (así las manda el servidor)
export function VersionsPage() {
  const { t } = useTranslation('studio')
  const query = useVersions()
  const { title, description } = useProblemText(query.error, 'versions')
  return (
    <>
      <PageHeader title={t('versions.title')} subtitle={t('versions.subtitle')} />
      <div className="mx-auto flex max-w-3xl flex-col px-4 pb-16 sm:px-8">
        <ImportLink />
        {query.isError ? (
          <ProblemState title={title} description={description}>
            <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
              {t('problem.retry')}
            </Button>
          </ProblemState>
        ) : query.data ? (
          <VersionList versions={query.data} />
        ) : (
          <LoadingState label={t('versions.loading')} />
        )}
      </div>
    </>
  )
}

function VersionList({ versions }: { versions: StudioVersion[] }) {
  const { t } = useTranslation('studio')
  if (versions.length === 0)
    return (
      <div className="flex max-w-prose flex-col items-start gap-2 py-12">
        <p className="text-base font-semibold text-ink">{t('versions.empty')}</p>
        <p className="text-sm text-ink-muted">{t('versions.emptyHint')}</p>
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
  const { t, i18n } = useTranslation('studio')
  const links = useWasichaiLinks()
  const locale = i18n.language
  return (
    <article aria-labelledby={`version-${version.id}`} className="flex flex-col gap-2 py-6">
      <h2 id={`version-${version.id}`} className="text-lg font-semibold leading-snug tracking-tight">
        <Link
          to={links.to(STUDIO_ROUTES.version, { id: version.id })}
          className="rounded-sm text-ink underline-offset-4 hover:text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t('versions.name', { course: version.course.title, number: version.number })}
        </Link>
      </h2>
      <p className="flex flex-wrap gap-x-2 text-sm text-ink-muted">
        <span>{version.course.code}</span>
        <span aria-hidden="true">·</span>
        <span className="font-medium text-ink">{t(`status.${version.status}`)}</span>
        {version.updatedAt ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{t('versions.updated', { date: formatInstant(version.updatedAt, locale) })}</span>
          </>
        ) : null}
      </p>
      {version.openComments > 0 ? (
        <p className="text-sm text-warning">{t('versions.openComments', { count: version.openComments, value: formatNumber(version.openComments, locale) })}</p>
      ) : null}
    </article>
  )
}
