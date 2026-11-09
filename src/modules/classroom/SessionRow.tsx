import { useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { BookOpen, ExternalLink, FlaskConical, MapPin, MessagesSquare, RotateCcw, Video, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { TEXT_LINK } from '../../shared/buttons'
import { timeZoneLabel } from '../../shared/format'
import { isHttpsUrl, type Session, type SessionStatus, type SessionType } from '../../shared/sessions'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'
import { StatusBadge, type StatusState } from './StatusBadge'

const TYPE_ICONS: Record<SessionType, LucideIcon> = {
  TEORIA: BookOpen,
  LABORATORIO: FlaskConical,
  CONSULTA: MessagesSquare,
  RECUPERACION: RotateCcw
}

// la insignia de cada estado: la palabra la dice siempre, el color nunca va solo
const SESSION_STATUS_STATE: Record<SessionStatus, StatusState> = {
  PROGRAMADA: 'active',
  REPROGRAMADA: 'warning',
  CANCELADA: 'overdue'
}

// se entra a una sesión que no está cancelada ni terminó y tiene un enlace https: el mismo criterio en la pestaña Sesiones y en el horario
function joinLink(session: Session, now: number): string | undefined {
  const ended = now >= Date.parse(session.end)
  return session.status !== 'CANCELADA' && !ended && session.link && isHttpsUrl(session.link) ? session.link : undefined
}

function Fact({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex min-w-0 items-center gap-1.5">
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </li>
  )
}

export interface SessionRowProps {
  enrollmentId: string
  session: Session
  now: number
  // la sesión que esta recupera, si se conoce
  original?: Session
  showZone: boolean
  lessonLink: boolean
  // en el horario, de qué curso es (cortado si es largo, entero en title)
  course?: string
  // en una lista que no dice el día, la fila lo dice antes de la hora
  withDate?: boolean
  // la pestaña Sesiones calla lo normal (programada) y dice solo lo que cambió; el horario, que mezcla cursos, dice siempre el estado
  scheduledBadge?: boolean
  id?: string
}

// una sesión en vivo, como la leen la pestaña Sesiones de un curso y el horario: su hora en la zona de la edición, su estado con palabra,
// el título, el tipo, la modalidad, el lugar y, si se puede, «Entrar a la sesión». una cancelada se ve tachada; a lo que terminó no se entra
export function SessionRow({
  enrollmentId,
  session,
  now,
  original,
  showZone,
  lessonLink,
  course,
  withDate = false,
  scheduledBadge = false,
  id
}: SessionRowProps) {
  const { t, i18n } = useTranslation('classroom')
  const cancelled = session.status === 'CANCELADA'
  const past = now >= Date.parse(session.end)
  const zone = { timeZone: session.timeZone }
  const hours = new Intl.DateTimeFormat(i18n.language, { timeStyle: 'short', ...zone }).formatRange(new Date(session.start), new Date(session.end))
  const date = withDate
    ? new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'short', ...zone }).format(new Date(session.start))
    : null
  const tone = cancelled ? 'text-ink-muted line-through' : past ? 'text-ink-muted' : 'text-ink'
  return (
    <article id={id} aria-label={session.title} className="flex min-w-0 scroll-mt-6 flex-col gap-1.5 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <time dateTime={session.start} className={`font-medium tabular-nums ${tone}`}>
          {date ? <span className="first-letter:uppercase">{date} · </span> : null}
          {hours}
        </time>
        {showZone ? <span className="text-ink-muted">{timeZoneLabel(session.timeZone, i18n.language)}</span> : null}
        {session.status !== 'PROGRAMADA' || scheduledBadge ? (
          <StatusBadge state={SESSION_STATUS_STATE[session.status]}>{t(`sessions.status.${session.status}`)}</StatusBadge>
        ) : null}
      </div>
      <p className={`font-read text-h5 font-normal break-words ${tone}`}>{session.title}</p>
      {course ? (
        <p className="truncate text-ink-muted" title={course}>
          {course}
        </p>
      ) : null}
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
      <SessionActions enrollmentId={enrollmentId} session={session} join={joinLink(session, now)} lessonLink={lessonLink} />
    </article>
  )
}

function SessionActions({ enrollmentId, session, join, lessonLink }: { enrollmentId: string; session: Session; join?: string; lessonLink: boolean }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
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
