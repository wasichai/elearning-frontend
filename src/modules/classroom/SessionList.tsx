import { useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { BookOpen, ExternalLink, FlaskConical, MapPin, MessagesSquare, RotateCcw, Video, type LucideIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { TEXT_LINK } from '../../shared/buttons'
import { timeZoneLabel, zonedDateTime } from '../../shared/format'
import { isHttpsUrl, type Session, type SessionType } from '../../shared/sessions'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'
import { StatusBadge } from './StatusBadge'

const TYPE_ICONS: Record<SessionType, LucideIcon> = {
  TEORIA: BookOpen,
  LABORATORIO: FlaskConical,
  CONSULTA: MessagesSquare,
  RECUPERACION: RotateCcw
}

interface Day {
  key: string
  sessions: Session[]
}

// agrupa por día en la zona de cada sesión, que es en la que se lee la hora: una a las 22:00 en Lima no cae en el día siguiente de UTC
function daysOf(sessions: Session[]): Day[] {
  const days: Day[] = []
  for (const session of sessions) {
    const key = zonedDateTime(session.start, session.timeZone).date
    const day = days.at(-1)
    if (day?.key === key) day.sessions.push(session)
    else days.push({ key, sessions: [session] })
  }
  return days
}

const byStart = (a: Session, b: Session) => Date.parse(a.start) - Date.parse(b.start)

// la agenda de las sesiones en vivo: por delante lo que viene, en orden; detrás lo pasado, lo más reciente primero. las horas van en la zona
// de la edición, que se dice. una cancelada se ve tachada y con su palabra, y a lo que ya terminó no se entra
export function SessionList({
  enrollmentId,
  sessions,
  headingLevel,
  lessonLinks = true
}: {
  enrollmentId: string
  sessions: Session[]
  headingLevel: 3 | 4
  lessonLinks?: boolean
}) {
  const { t, i18n } = useTranslation('classroom')
  const [now] = useState(() => Date.now())
  const zones = [...new Set(sessions.map((session) => session.timeZone))]
  const ended = (session: Session) => now >= Date.parse(session.end)
  const upcoming = sessions.filter((session) => !ended(session)).sort(byStart)
  const past = sessions.filter(ended).sort(byStart).reverse()
  const group = (list: Session[], isPast: boolean) => (
    <ol className="flex flex-col divide-y divide-border">
      {daysOf(list).map((day) => (
        <li key={day.key}>
          <DayGroup day={day} level={headingLevel + 1}>
            {day.sessions.map((session) => (
              <li key={session.id} className="py-3 first:pt-0 last:pb-0">
                <SessionItem
                  enrollmentId={enrollmentId}
                  session={session}
                  sessions={sessions}
                  past={isPast}
                  showZone={zones.length > 1}
                  lessonLink={lessonLinks}
                />
              </li>
            ))}
          </DayGroup>
        </li>
      ))}
    </ol>
  )
  return (
    <div className="flex flex-col gap-8">
      {zones.length === 1 ? <p className="text-sm text-ink-muted">{t('sessions.timeZone', { zone: timeZoneLabel(zones[0]!, i18n.language) })}</p> : null}
      <AgendaGroup title={t('sessions.upcoming')} level={headingLevel}>
        {upcoming.length > 0 ? group(upcoming, false) : <p className="text-sm text-ink-muted">{t('sessions.noneUpcoming')}</p>}
      </AgendaGroup>
      {past.length > 0 ? (
        <AgendaGroup title={t('sessions.past')} level={headingLevel}>
          {group(past, true)}
        </AgendaGroup>
      ) : null}
    </div>
  )
}

function AgendaGroup({ title, level, children }: { title: string; level: 3 | 4; children: ReactNode }) {
  const id = useId()
  const Heading = `h${level}` as const
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <Heading id={id} className="border-b border-border pb-2 text-title-3 text-ink">
        {title}
      </Heading>
      {children}
    </section>
  )
}

// el día a la izquierda en pantallas anchas, encima en un móvil
function DayGroup({ day, level, children }: { day: Day; level: number; children: ReactNode }) {
  const { i18n } = useTranslation('classroom')
  const first = day.sessions[0]!
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(i18n.language, { ...options, timeZone: first.timeZone }).format(new Date(first.start))
  const Heading = `h${level}` as 'h4' | 'h5'
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
      <Heading className="text-sm sm:w-48 sm:shrink-0 sm:pt-0.5">
        <span className="inline-block font-semibold text-ink first-letter:uppercase sm:block">{format({ weekday: 'long' })}</span>{' '}
        <span className="text-ink-muted sm:block">{format({ day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </Heading>
      <ul className="flex min-w-0 flex-1 flex-col divide-y divide-border">{children}</ul>
    </div>
  )
}

function Fact({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex min-w-0 items-center gap-1.5">
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </li>
  )
}

function SessionItem({
  enrollmentId,
  session,
  sessions,
  past,
  showZone,
  lessonLink
}: {
  enrollmentId: string
  session: Session
  sessions: Session[]
  past: boolean
  showZone: boolean
  lessonLink: boolean
}) {
  const { t, i18n } = useTranslation('classroom')
  const cancelled = session.status === 'CANCELADA'
  const original = session.originalSessionId ? sessions.find((candidate) => candidate.id === session.originalSessionId) : undefined
  const hours = new Intl.DateTimeFormat(i18n.language, { timeStyle: 'short', timeZone: session.timeZone }).formatRange(
    new Date(session.start),
    new Date(session.end)
  )
  return (
    <article aria-label={session.title} className="flex flex-col gap-1.5 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <time
          dateTime={session.start}
          className={`font-medium tabular-nums ${cancelled ? 'text-ink-muted line-through' : past ? 'text-ink-muted' : 'text-ink'}`}
        >
          {hours}
        </time>
        {showZone ? <span className="text-ink-muted">{timeZoneLabel(session.timeZone, i18n.language)}</span> : null}
        {cancelled ? <StatusBadge state="overdue">{t('sessions.status.CANCELADA')}</StatusBadge> : null}
        {session.status === 'REPROGRAMADA' ? <StatusBadge state="warning">{t('sessions.status.REPROGRAMADA')}</StatusBadge> : null}
      </div>
      <p className={`text-base font-medium ${cancelled ? 'text-ink-muted line-through' : past ? 'text-ink-muted' : 'text-ink'}`}>{session.title}</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-ink-muted">
        <Fact icon={TYPE_ICONS[session.type]}>{t(`sessions.type.${session.type}`)}</Fact>
        <Fact icon={session.modality === 'VIRTUAL' ? Video : MapPin}>{t(`sessions.modality.${session.modality}`)}</Fact>
        {session.location ? <Fact icon={MapPin}>{session.location}</Fact> : null}
      </ul>
      {original ? <p className="text-ink-muted">{t('sessions.recovers', { title: original.title })}</p> : null}
      {!cancelled && (past || session.attendance) ? (
        <p className="text-ink">
          <span className="text-ink-muted">{t('sessions.attendance')} </span>
          {session.attendance ? t(`sessions.attendanceStatus.${session.attendance}`) : t('sessions.attendanceNone')}
        </p>
      ) : null}
      <SessionActions enrollmentId={enrollmentId} session={session} cancelled={cancelled} past={past} lessonLink={lessonLink} />
    </article>
  )
}

function SessionActions({
  enrollmentId,
  session,
  cancelled,
  past,
  lessonLink
}: {
  enrollmentId: string
  session: Session
  cancelled: boolean
  past: boolean
  lessonLink: boolean
}) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const join = !cancelled && !past && session.link && isHttpsUrl(session.link) ? session.link : undefined
  const toLesson = lessonLink && session.lessonId ? session.lessonId : undefined
  if (!join && !toLesson) return null
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
      {join ? (
        <Button asChild variant="secondary" className="min-h-11 gap-2 sm:min-h-9">
          <a href={join} target="_blank" rel="noopener noreferrer" aria-label={t('sessions.joinLabel', { title: session.title })}>
            <ExternalLink aria-hidden="true" className="size-4" />
            {t('sessions.join')}
          </a>
        </Button>
      ) : null}
      {toLesson ? (
        <Link to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId }, { [LESSON_PARAM]: toLesson })} className={TEXT_LINK}>
          {t('sessions.toLesson')}
        </Link>
      ) : null}
    </div>
  )
}
