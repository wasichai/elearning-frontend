import { ApiError, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { TEXT_LINK, WRAP } from '../../shared/buttons'
import { formatDateTime } from '../../shared/format'
import { Notice } from '../../shared/Notice'
import { Section, Skeleton } from '../../shared/Screen'
import { StatusBadge, type StatusState } from '../../shared/StatusBadge'
import type { ImportJob, ImportStatus } from './contract'
import { isFinished, parseSourceRef, useImportCourses, useImportJobs } from './importApi'
import { STUDIO_ROUTES } from './routes'

const JOB_BADGE: Record<ImportStatus, StatusState> = { PENDIENTE: 'todo', EN_CURSO: 'active', HECHO: 'done', FALLIDO: 'overdue' }

// lo terminado que se ve sin desplegar: hasta 50 filas enterrarían el formulario. lo que sigue en marcha no se pliega nunca
const VISIBLE = 3

// los trabajos de quien entra, antes del formulario: al volver a la pantalla, lo primero es retomar lo que dejó. el orden es
// el del servidor. la retención que dice el texto es la del contrato (lms.jobs.retention, 30 días): el servidor no la expone
export function ImportJobs({ interval, onOpen }: { interval: number; onOpen: (job: ImportJob) => void }) {
  const { t } = useTranslation('studio')
  const query = useImportJobs(interval)
  const courses = useImportCourses()
  const [expanded, setExpanded] = useState(false)
  const jobs = query.data
  const refused = query.error instanceof ApiError && query.error.status === 403
  const titles = new Map((courses.data ?? []).map((course) => [course.id, course.title]))
  const shown = jobs?.filter((job, index) => expanded || !isFinished(job.status) || VISIBLE > index)
  const hidden = (jobs?.length ?? 0) - (shown?.length ?? 0)
  const active = jobs?.filter((job) => !isFinished(job.status)).length ?? 0
  return (
    <Section title={t('import.jobs.title')} description={jobs && jobs.length > 0 ? t('import.jobs.retention') : undefined}>
      {query.isError ? (
        <div className="flex flex-col items-start gap-2">
          <Notice tone="warning">{refused ? `${t('import.jobs.refused')} ${t('import.problem.refusedHint')}` : t('import.jobs.failed')}</Notice>
          {refused ? null : (
            <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
              {t('problem.retry')}
            </Button>
          )}
        </div>
      ) : null}
      {query.isPending ? (
        <div role="status" className="flex flex-col gap-2 border-y border-border py-3">
          <span className="sr-only">{t('import.jobs.loading')}</span>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : null}
      {jobs && jobs.length === 0 ? <p className="max-w-prose text-sm text-ink-muted">{t('import.jobs.empty')}</p> : null}
      {shown && shown.length > 0 ? (
        <>
          {/* el sondeo cambia las filas en silencio: se anuncia solo cuántas siguen en marcha */}
          <p role="status" className="sr-only">
            {t('import.jobs.active', { count: active })}
          </p>
          <ul className="flex flex-col divide-y divide-border border-y border-border">
            {shown.map((job) => (
              <li key={job.id}>
                <JobRow job={job} courseTitle={titles.get(job.courseId)} onOpen={() => onOpen(job)} />
              </li>
            ))}
          </ul>
          {hidden > 0 || expanded ? (
            <Button variant="ghost" aria-expanded={expanded} className="-ml-4 min-h-11 self-start" onClick={() => setExpanded(!expanded)}>
              {expanded ? t('import.jobs.less') : t('import.jobs.more', { count: hidden })}
            </Button>
          ) : null}
        </>
      ) : null}
    </Section>
  )
}

// source viene de lo que se pidió: se pinta como texto. sin el curso entre los legibles, el trabajo se nombra por su archivo
function JobRow({ job, courseTitle, onOpen }: { job: ImportJob; courseTitle: string | undefined; onOpen: () => void }) {
  const { t, i18n } = useTranslation('studio')
  const links = useWasichaiLinks()
  const source = parseSourceRef(job.source)
  const subject = courseTitle ?? source?.path ?? job.source
  // lo que el título ya dice no se repite
  const detail = !source ? (courseTitle ? job.source : null) : courseTitle ? `${source.repository}:${source.path}` : source.repository
  const instant = job.finishedAt ?? job.createdAt
  const date = formatDateTime(instant, i18n.language, Intl.DateTimeFormat().resolvedOptions().timeZone)
  const action = !isFinished(job.status)
    ? t('import.jobs.follow')
    : job.status === 'FALLIDO'
      ? t('import.jobs.reason')
      : job.report
        ? t('import.jobs.report')
        : null
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold [overflow-wrap:anywhere] text-ink">{subject}</span>
          <StatusBadge state={JOB_BADGE[job.status]}>{t(`import.jobs.status.${job.status}`)}</StatusBadge>
        </div>
        {detail ? <span className="font-mono text-xs break-all text-ink-muted">{detail}</span> : null}
        <time dateTime={instant} className="text-sm text-ink-muted">
          {t(job.finishedAt ? 'import.jobs.finished' : 'import.jobs.requested', { date })}
        </time>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
        {action ? (
          <Button variant="secondary" className={`min-h-11 ${WRAP}`} aria-label={t('import.jobs.actionFor', { action, subject })} onClick={onOpen}>
            {action}
          </Button>
        ) : null}
        {job.status === 'HECHO' && job.versionId ? (
          <Link
            to={links.to(STUDIO_ROUTES.version, { id: job.versionId })}
            aria-label={t('import.jobs.actionFor', { action: t('import.job.openDraft'), subject })}
            className={TEXT_LINK}
          >
            {t('import.job.openDraft')}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
