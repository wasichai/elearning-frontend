import { EmptyState, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Inbox } from 'lucide-react'
import { formatInstant, formatNumber } from '../../shared/format'
import { ListSkeleton } from '../../shared/ListSkeleton'
import { useRefetchOnRevisit } from '../../shared/revisit'
import { ScreenBody, ScreenHeader } from '../../shared/Screen'
import { GeneratorBadge } from '../../shared/GeneratorBadge'
import { StatusBadge } from '../../shared/StatusBadge'
import { useInbox } from './api'
import type { StudioVersion } from './contract'
import { VERSION_BADGE } from '../../shared/VersionStatusLine'
import { QueryProblem } from './parts'
import { REVIEW_MODULE_ID, REVIEW_ROUTES } from './routes'

// la bandeja del revisor: las versiones en revisión a cargo de la persona, la que más espera primero (así las ordena el servidor)
export function InboxPage() {
  const { t } = useTranslation('review')
  const query = useInbox()
  useRefetchOnRevisit(query.refetch)
  return (
    <>
      <ScreenHeader title={t('inbox.title')} subtitle={t('inbox.subtitle')} />
      <ScreenBody>
        {query.isError ? (
          <QueryProblem error={query.error} resource="inbox" onRetry={() => void query.refetch()} />
        ) : query.data ? (
          <VersionList versions={query.data} />
        ) : (
          <ListSkeleton label={t('inbox.loading')} />
        )}
      </ScreenBody>
    </>
  )
}

function VersionList({ versions }: { versions: StudioVersion[] }) {
  const { t } = useTranslation('review')
  if (versions.length === 0)
    return (
      <EmptyState title={t('inbox.empty')} icon={Inbox}>
        <p>{t('inbox.emptyHint')}</p>
      </EmptyState>
    )
  return (
    <ul className="flex flex-col divide-y divide-border border-y border-border">
      {versions.map((version, index) => (
        <li key={version.id}>
          <VersionItem version={version} primary={index === 0} />
        </li>
      ))}
    </ul>
  )
}

// la primera es la que más espera: su «Revisar» es la única primaria
function VersionItem({ version, primary }: { version: StudioVersion; primary: boolean }) {
  const { t, i18n } = useTranslation('review')
  const links = useWasichaiLinks()
  const locale = i18n.language
  const headingId = `version-${version.id}`
  const to = links.to(REVIEW_ROUTES.version, { versionId: version.id })
  return (
    <article aria-labelledby={headingId} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
      <div className="flex min-w-0 flex-1 basis-72 flex-col gap-1.5">
        <h2 id={headingId} className="text-title-3 text-ink [overflow-wrap:anywhere]">
          <Link to={to} className="inline-flex min-h-11 items-center rounded-sm underline-offset-4 hover:text-brand-strong hover:underline sm:min-h-6">
            {version.course.title}
          </Link>
        </h2>
        <p className="text-sm text-ink-muted">{t('inbox.code', { course: version.course.code, number: version.number })}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-muted">
          <StatusBadge state={VERSION_BADGE[version.status]}>{t(`status.${version.status}`)}</StatusBadge>
          <GeneratorBadge namespace={REVIEW_MODULE_ID} generator={version.generator} />
          {version.openComments > 0 ? (
            <StatusBadge state="warning">
              {t('inbox.openComments', { count: version.openComments, value: formatNumber(version.openComments, locale) })}
            </StatusBadge>
          ) : (
            <span>{t('inbox.noOpenComments')}</span>
          )}
          {version.updatedAt ? <span>{t('inbox.waiting', { date: formatInstant(version.updatedAt, locale) })}</span> : null}
          {/* la bandeja solo trae lo mío: con revisor puesto, ese revisor soy yo */}
          {version.reviewerId ? <span>{t('inbox.assigned')}</span> : null}
        </div>
      </div>
      <Button asChild variant={primary ? 'primary' : 'secondary'} className="min-h-11">
        <Link to={to} aria-label={t('inbox.reviewLabel', { code: version.course.code, number: version.number })}>
          {t('inbox.review')}
        </Link>
      </Button>
    </article>
  )
}
