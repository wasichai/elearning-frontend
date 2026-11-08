import { useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { CircleAlert, Clock } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatAgendaDay, formatTimeRange, timeZoneLabel, zonedDateTime } from '../../shared/format'
import { Section, Skeleton } from '../../shared/Screen'
import type { AgendaSession } from './agenda'
import type { AssessmentSummary } from './contract'
import { sessionsByDay, type Block, type RailAssessment } from './dashboard'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'
import { StatusBadge } from './StatusBadge'

// lo que cabe en cada bloque: el resto se cuenta, no se pinta
const MAX_ROWS = 5

export interface DashboardRailProps {
  // las sesiones de los próximos 7 días (agenda) y las evaluaciones por hacer (panel): cada bloque con su lectura
  week: Block<AgendaSession>
  assessments: Block<RailAssessment>
  // la zona que la página ya dice para todo: si las sesiones van en ella, el bloque no la repite
  pageZone?: string
  now: number
}

// la columna lateral del panel (Dashboard.dc.html): en escritorio al lado, en un móvil debajo de todo. sin tarjetas: secciones con filetes
export function DashboardRail({ week, assessments, pageZone, now }: DashboardRailProps) {
  const { t } = useTranslation('classroom')
  return (
    <aside aria-label={t('dashboard.rail')} className="flex min-w-0 flex-col gap-10">
      <WeekBlock block={week} pageZone={pageZone} now={now} />
      <AssessmentsBlock block={assessments} />
    </aside>
  )
}

function BlockBody<T>({
  block,
  empty,
  failedText,
  retryLabel,
  more,
  children
}: {
  block: Block<T>
  empty: string
  failedText: string
  retryLabel: string
  more: (count: number) => string
  children: (items: T[]) => ReactNode
}) {
  const { t } = useTranslation('classroom')
  const hidden = block.items.length - MAX_ROWS
  return (
    <>
      {block.failed ? (
        <div role="alert" className="text-secondary flex gap-2">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
          <div className="flex min-w-0 flex-col items-start gap-2">
            <p className="text-ink">{failedText}</p>
            <Button variant="secondary" className="min-h-11" aria-label={retryLabel} onClick={block.retry}>
              {t('problem.retry')}
            </Button>
          </div>
        </div>
      ) : null}
      {block.loading ? (
        <div role="status" className="flex flex-col gap-3">
          <span className="sr-only">{t('dashboard.loading')}</span>
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : null}
      {block.items.length > 0 ? children(block.items.slice(0, MAX_ROWS)) : null}
      {hidden > 0 ? <p className="text-secondary text-ink-muted">{more(hidden)}</p> : null}
      {!block.loading && !block.failed && block.items.length === 0 ? <p className="text-secondary text-ink-muted">{empty}</p> : null}
    </>
  )
}

const ROW_LINK =
  'flex min-h-11 min-w-0 flex-col gap-0.5 py-1 break-words transition-colors duration-[160ms] hover:bg-surface-muted motion-reduce:transition-none'

// «Esta semana»: un día por fila (su nombre y su número a la izquierda) con sus sesiones, cada una con su hora, su título y de qué curso es.
// el estado se dice con palabras: una reprogramada o cancelada lo pone en su línea
function WeekBlock({ block, pageZone, now }: { block: Block<AgendaSession>; pageZone?: string; now: number }) {
  const { t, i18n } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const locale = i18n.language
  const zones = [...new Set(block.items.slice(0, MAX_ROWS).map((session) => session.timeZone))]
  return (
    <Section
      title={t('dashboard.sessions.title')}
      description={zones.length === 1 && zones[0] !== pageZone ? t('sessions.timeZone', { zone: timeZoneLabel(zones[0]!, locale) }) : undefined}
    >
      <BlockBody
        block={block}
        empty={t('dashboard.sessions.none')}
        failedText={t('dashboard.sessions.failed')}
        retryLabel={t('dashboard.sessions.retry')}
        more={(count) => t('dashboard.sessions.more', { count })}
      >
        {(items) => (
          <ol className="-mt-3 flex flex-col">
            {sessionsByDay(items).map((day) => {
              const { weekday, day: number } = formatAgendaDay(day.start, locale, day.timeZone)
              // hoy, en la zona de sus sesiones: el día va en marca; el nombre y el número ya dicen cuál es
              const today = zonedDateTime(new Date(now).toISOString(), day.timeZone).date === zonedDateTime(day.start, day.timeZone).date
              return (
                <li key={day.key} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 border-b border-border py-3">
                  <p className={`flex flex-col ${today ? 'text-brand' : 'text-ink'}`}>
                    <span className={`meta ${today ? 'text-brand' : ''}`}>{weekday}</span>
                    <span className="text-h4 tabular-nums">{number}</span>
                  </p>
                  <ul className="flex min-w-0 flex-col gap-2">
                    {day.sessions.map((session) => (
                      <li key={`${session.enrollmentId}-${session.id}`}>
                        <Link to={links.to(CLASSROOM_ROUTES.sessions, { enrollmentId: session.enrollmentId })} className={ROW_LINK}>
                          <time dateTime={session.start} className="text-label text-ink">
                            {formatTimeRange(session.start, session.end, locale, session.timeZone)}
                          </time>
                          <span data-slot="session-title" className="font-read text-h5 font-normal text-ink">
                            {session.title}
                          </span>
                          <span className="text-secondary text-ink-muted">
                            {[
                              t(`sessions.type.${session.type}`),
                              t(`sessions.modality.${session.modality}`),
                              session.status === 'PROGRAMADA' ? null : t(`sessions.status.${session.status}`)
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                          <span className="text-secondary text-ink-muted">{session.courseTitle}</span>
                          {zones.length > 1 ? <span className="text-secondary text-ink-muted">{timeZoneLabel(session.timeZone, locale)}</span> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ol>
        )}
      </BlockBody>
    </Section>
  )
}

function AssessmentState({ assessment }: { assessment: AssessmentSummary }) {
  const { t } = useTranslation('classroom')
  if (assessment.openAttemptId) return <StatusBadge state="active">{t('dashboard.assessments.open')}</StatusBadge>
  if (assessment.best?.pending) return <StatusBadge state="review">{t('dashboard.assessments.grading')}</StatusBadge>
  return (
    <span className="text-secondary inline-flex items-center gap-1.5 font-semibold text-warning">
      <Clock aria-hidden="true" className="size-4 shrink-0" />
      {t('dashboard.assessments.attemptsLeft', { count: assessment.maxAttempts - assessment.attemptsUsed })}
    </span>
  )
}

// «Por hacer»: las evaluaciones que quedan, sin plazos (el modelo no los tiene)
function AssessmentsBlock({ block }: { block: Block<RailAssessment> }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  return (
    <Section title={t('dashboard.assessments.title')}>
      <BlockBody
        block={block}
        empty={t('dashboard.assessments.none')}
        failedText={t('dashboard.assessments.failed')}
        retryLabel={t('dashboard.assessments.retry')}
        more={(count) => t('dashboard.assessments.more', { count })}
      >
        {(items) => (
          <ul className="-mt-3 flex flex-col divide-y divide-border border-b border-border">
            {items.map(({ lessonId, assessment, enrollment }) => (
              <li key={`${enrollment.id}-${lessonId}`} className="py-2">
                <Link to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId: enrollment.id }, { [LESSON_PARAM]: lessonId })} className={ROW_LINK}>
                  <span className="font-read text-h5 font-normal text-ink">{assessment.title}</span>
                  <span className="text-secondary text-ink-muted">{enrollment.course.title}</span>
                  <span className="mt-1 flex">
                    <AssessmentState assessment={assessment} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </BlockBody>
    </Section>
  )
}
