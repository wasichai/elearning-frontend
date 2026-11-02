import { useQueries } from '@tanstack/react-query'
import { useApiClient, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { timeZoneLabel } from '../../shared/format'
import { Section, Skeleton, Stat, StatList } from '../../shared/Screen'
import type { Session } from '../../shared/sessions'
import { classroomQuery, sessionsQuery } from './api'
import type { Classroom, Enrollment } from './contract'
import { blockOf, MAX_RAIL_COURSES, pendingAssessments, type Block, sessionsWithin, upcomingSessions } from './dashboard'
import type { PlacedLesson } from './lessons'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'
import { StatusBadge } from './StatusBadge'

// lo que cabe en el riel de cada bloque: el resto se cuenta, no se pinta
const MAX_ROWS = 5
const WEEK_DAYS = 7

export type UpcomingSession = Session & { enrollment: Enrollment }
export type PendingAssessment = PlacedLesson & { enrollment: Enrollment }

export interface RailData {
  sessions: Block<UpcomingSession>
  assessments: Block<PendingAssessment>
  // las sesiones de los próximos 7 días. solo con todas las consultas leídas y sin tope: si no, la cifra no sería exacta
  sessionsThisWeek?: number
  refetch: () => void
}

// las mismas consultas (y caché) que el aula y sus sesiones. cada consulta falla por su cuenta: el panel no depende de ellas
export function useRailData(enrollments: Enrollment[], capped: boolean): RailData {
  const client = useApiClient()
  const classrooms = useQueries({ queries: enrollments.map((enrollment) => classroomQuery(client, enrollment.id)) })
  const sessionLists = useQueries({ queries: enrollments.map((enrollment) => sessionsQuery(client, enrollment.id)) })
  const now = Date.now()
  const sessions = blockOf<Session[], UpcomingSession>(sessionLists, (list, index) => list.map((session) => ({ ...session, enrollment: enrollments[index]! })))
  const upcoming = upcomingSessions(sessions.items, now)
  const assessments = blockOf<Classroom, PendingAssessment>(classrooms, (classroom, index) =>
    pendingAssessments(classroom).map((placed) => ({ ...placed, enrollment: enrollments[index]! }))
  )
  const exact = !capped && !sessions.loading && !sessions.failed
  return {
    sessions: { ...sessions, items: upcoming },
    assessments,
    sessionsThisWeek: exact ? sessionsWithin(upcoming, now, WEEK_DAYS).length : undefined,
    refetch: () => [...classrooms, ...sessionLists].forEach((query) => void query.refetch())
  }
}

export interface DashboardRailProps {
  data: RailData
  // sin cursos activos no hay nada que leer y los dos bloques sobran
  showBlocks: boolean
  capped: boolean
  // las cifras, si hay más de un curso que contar
  figures?: { inProgress: number; completed: number }
}

// el riel del panel: en escritorio al lado, en un móvil debajo de todo. sin tarjetas: secciones con filas
export function DashboardRail({ data, showBlocks, capped, figures }: DashboardRailProps) {
  const { t, i18n } = useTranslation('classroom')
  return (
    <aside aria-label={t('dashboard.rail')} className="flex min-w-0 flex-col gap-8 lg:border-l lg:border-border lg:pl-8">
      {figures ? (
        <StatList>
          <Stat label={t('dashboard.figures.inProgress')} value={new Intl.NumberFormat(i18n.language).format(figures.inProgress)} />
          <Stat label={t('dashboard.figures.completed')} value={new Intl.NumberFormat(i18n.language).format(figures.completed)} />
        </StatList>
      ) : null}
      {showBlocks ? (
        <>
          <SessionsBlock block={data.sessions} />
          <AssessmentsBlock block={data.assessments} />
          {capped ? <p className="text-sm text-ink-muted">{t('dashboard.capped', { count: MAX_RAIL_COURSES })}</p> : null}
        </>
      ) : null}
    </aside>
  )
}

function BlockBody<T>({
  block,
  empty,
  failedText,
  retryLabel,
  more,
  row
}: {
  block: Block<T>
  empty: string
  failedText: string
  retryLabel: string
  more: (count: number) => string
  row: (item: T) => ReactNode
}) {
  const { t } = useTranslation('classroom')
  const hidden = block.items.length - MAX_ROWS
  return (
    <>
      {block.failed ? (
        <div role="alert" className="flex gap-2 text-sm">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
          <div className="flex min-w-0 flex-col items-start gap-2">
            <p className="text-ink">
              {failedText}
              {block.partial ? ` ${t('dashboard.partial')}` : null}
            </p>
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
      {block.items.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border border-y border-border">{block.items.slice(0, MAX_ROWS).map(row)}</ul>
      ) : null}
      {hidden > 0 ? <p className="text-sm text-ink-muted">{more(hidden)}</p> : null}
      {!block.loading && !block.failed && block.items.length === 0 ? <p className="text-sm text-ink-muted">{empty}</p> : null}
    </>
  )
}

const ROW_LINK =
  'flex min-h-11 flex-col gap-0.5 py-2.5 text-sm break-words transition-colors duration-[160ms] hover:bg-surface-muted motion-reduce:transition-none'

// día de la semana y hora, en la zona de la edición: la que se dice en el bloque o, si hay varias, en la fila
function formatStart(start: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone }).format(
    new Date(start)
  )
}

function SessionsBlock({ block }: { block: Block<UpcomingSession> }) {
  const { t, i18n } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const zones = [...new Set(block.items.slice(0, MAX_ROWS).map((session) => session.timeZone))]
  return (
    <Section
      title={t('dashboard.sessions.title')}
      description={zones.length === 1 ? t('sessions.timeZone', { zone: timeZoneLabel(zones[0]!, i18n.language) }) : undefined}
    >
      <BlockBody
        block={block}
        empty={t('dashboard.sessions.none')}
        failedText={t('dashboard.sessions.failed')}
        retryLabel={t('dashboard.sessions.retry')}
        more={(count) => t('dashboard.sessions.more', { count })}
        row={(session) => (
          <li key={`${session.enrollment.id}-${session.id}`}>
            <Link to={links.to(CLASSROOM_ROUTES.sessions, { enrollmentId: session.enrollment.id })} className={ROW_LINK}>
              <span className="font-medium text-ink">{session.title}</span>
              <time dateTime={session.start} className="text-ink">
                {formatStart(session.start, i18n.language, session.timeZone)}
              </time>
              {zones.length > 1 ? <span className="text-ink-muted">{timeZoneLabel(session.timeZone, i18n.language)}</span> : null}
              <span className="text-ink-muted">
                {session.enrollment.course.title}
                {session.status === 'REPROGRAMADA' ? ` · ${t('sessions.status.REPROGRAMADA')}` : null}
              </span>
            </Link>
          </li>
        )}
      />
    </Section>
  )
}

function AssessmentState({ lesson }: { lesson: PlacedLesson['lesson'] }) {
  const { t } = useTranslation('classroom')
  const assessment = lesson.assessment!
  if (assessment.openAttemptId) return <StatusBadge state="active">{t('dashboard.assessments.open')}</StatusBadge>
  if (assessment.best?.pending) return <StatusBadge state="review">{t('dashboard.assessments.grading')}</StatusBadge>
  return <span className="text-ink-muted">{t('dashboard.assessments.attemptsLeft', { count: assessment.maxAttempts - assessment.attemptsUsed })}</span>
}

function AssessmentsBlock({ block }: { block: Block<PendingAssessment> }) {
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
        row={({ lesson, enrollment }) => (
          <li key={`${enrollment.id}-${lesson.id}`}>
            <Link to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId: enrollment.id }, { [LESSON_PARAM]: lesson.id })} className={ROW_LINK}>
              <span className="font-medium text-ink">{lesson.assessment!.title}</span>
              <span className="text-ink-muted">{enrollment.course.title}</span>
              <span className="mt-0.5 flex">
                <AssessmentState lesson={lesson} />
              </span>
            </Link>
          </li>
        )}
      />
    </Section>
  )
}
