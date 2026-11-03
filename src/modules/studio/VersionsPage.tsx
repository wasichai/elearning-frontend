import { EmptyState, LoadingState, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { CordBanner } from '../../shared/CordBanner'
import { formatInstant, formatNumber } from '../../shared/format'
import { ProblemState } from '../../shared/ProblemState'
import { useRefetchOnRevisit } from '../../shared/revisit'
import { ScreenBody, ScreenHeader } from '../../shared/Screen'
import { StatusBadge } from '../../shared/StatusBadge'
import { useSubmitVersion, useVersions } from './api'
import type { StudioVersion } from './contract'
import { ImportLink } from './ImportLink'
import { NewCourseLink } from './NewCourseLink'
import { VERSION_BADGE } from '../../shared/VersionStatusLine'
import { useProblemText } from './parts'
import { STUDIO_ROUTES } from './routes'
import { NewVersionButton, SubmitVersionButton } from './VersionActions'

// cuánto pide una versión a quien la escribe, de más a menos: un borrador con comentarios, un borrador, una que espera a otra
// persona y una que ya terminó. lo demás conserva el orden del servidor (las más recientes primero)
function urgency(version: StudioVersion): number {
  if (version.status === 'BORRADOR') return version.openComments > 0 ? 0 : 1
  return version.status === 'EN_REVISION' || version.status === 'APROBADA' ? 2 : 3
}

interface CourseGroup {
  course: StudioVersion['course']
  versions: StudioVersion[]
  // la versión de la que saldría una nueva; solo si el curso no tiene nada en curso
  newFrom: StudioVersion | null
}

function groupByCourse(versions: StudioVersion[]): CourseGroup[] {
  const byCourse = new Map<string, StudioVersion[]>()
  for (const version of versions) byCourse.set(version.course.id, [...(byCourse.get(version.course.id) ?? []), version])
  const groups = [...byCourse.values()].map((items) => {
    const sorted = [...items].sort((a, b) => urgency(a) - urgency(b))
    const idle = items.every((version) => urgency(version) === 3)
    return {
      course: items[0]!.course,
      versions: sorted,
      newFrom: idle ? items.reduce((last, version) => (version.number > last.number ? version : last)) : null
    }
  })
  return groups.sort((a, b) => urgency(a.versions[0]!) - urgency(b.versions[0]!))
}

// la única primaria de la pantalla: la primera acción de lo que va primero
function firstAction(groups: CourseGroup[]): string | null {
  for (const group of groups) {
    const draft = group.versions.find((version) => version.status === 'BORRADOR')
    if (draft) return draft.id
    if (group.newFrom) return group.course.id
  }
  return null
}

// «Mis versiones»: las versiones de curso que escribió la persona, por curso y con lo que requiere acción primero
export function VersionsPage() {
  const { t } = useTranslation('studio')
  const query = useVersions()
  useRefetchOnRevisit(query.refetch)
  const { title, description } = useProblemText(query.error, 'versions')
  return (
    <>
      <ScreenHeader
        title={t('versions.title')}
        subtitle={t('versions.subtitle')}
        actions={
          <>
            <NewCourseLink />
            <ImportLink />
          </>
        }
      />
      <ScreenBody>
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
      </ScreenBody>
    </>
  )
}

function VersionList({ versions }: { versions: StudioVersion[] }) {
  const { t } = useTranslation('studio')
  if (versions.length === 0)
    return (
      <EmptyState title={t('versions.empty')}>
        <p>{t('versions.emptyHint')}</p>
      </EmptyState>
    )
  const groups = groupByCourse(versions)
  const primary = firstAction(groups)
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <CourseVersions key={group.course.id} group={group} primary={primary} />
      ))}
    </div>
  )
}

function CourseVersions({ group, primary }: { group: CourseGroup; primary: string | null }) {
  const { t } = useTranslation('studio')
  const { course, versions, newFrom } = group
  const headingId = `course-${course.id}`
  return (
    <section aria-labelledby={headingId} className="overflow-hidden rounded-card border border-border bg-surface">
      <CordBanner seed={course.code} height={28} />
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-4 pt-4 sm:px-5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={headingId} className="text-title-3 text-ink [overflow-wrap:anywhere]">
            {course.title}
          </h2>
          <p className="text-sm text-ink-muted">{course.code}</p>
        </div>
        {newFrom ? (
          <NewVersionButton
            source={newFrom}
            label={t('versions.newVersion')}
            ariaLabel={t('versions.newVersionLabel', { course: course.title })}
            variant={primary === course.id ? 'primary' : 'secondary'}
          />
        ) : null}
      </div>
      <ul className="mt-2 flex flex-col divide-y divide-border px-4 sm:px-5">
        {versions.map((version) => (
          <li key={version.id}>
            <VersionItem version={version} primary={primary === version.id} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function VersionItem({ version, primary }: { version: StudioVersion; primary: boolean }) {
  const { t, i18n } = useTranslation('studio')
  const links = useWasichaiLinks()
  const submit = useSubmitVersion(version.id)
  const locale = i18n.language
  const headingId = `version-${version.id}`
  const name = { course: version.course.title, number: version.number }
  return (
    <article aria-labelledby={headingId} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h3 id={headingId} className="text-base font-semibold text-ink">
          <Link
            to={links.to(STUDIO_ROUTES.version, { id: version.id })}
            aria-label={t('versions.name', name)}
            className="inline-flex min-h-11 items-center rounded-sm text-link underline-offset-4 hover:underline sm:min-h-6"
          >
            {t('versions.number', { number: version.number })}
          </Link>
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-muted">
          <StatusBadge state={VERSION_BADGE[version.status]}>{t(`status.${version.status}`)}</StatusBadge>
          {version.openComments > 0 ? (
            <StatusBadge state="warning">
              {t('versions.openComments', { count: version.openComments, value: formatNumber(version.openComments, locale) })}
            </StatusBadge>
          ) : null}
          {version.updatedAt ? <span>{t('versions.updated', { date: formatInstant(version.updatedAt, locale) })}</span> : null}
        </div>
        <p role="status" className="text-sm text-success empty:hidden">
          {submit.isSuccess ? t('version.submitted') : ''}
        </p>
      </div>
      {version.status === 'BORRADOR' ? (
        <SubmitVersionButton version={version} submit={submit} variant={primary ? 'primary' : 'secondary'} ariaLabel={t('versions.submitLabel', name)} />
      ) : null}
    </article>
  )
}
