import { useWasichaiLinks } from '@wasichai/core'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatInstantRange, timeZoneLabel } from '../../shared/format'
import { isHttpsUrl, type Session } from '../../shared/sessions'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'

// las sesiones en vivo de una matrícula: cuándo (en la zona de la edición, que se dice), cómo, su estado, el enlace o el
// lugar y la asistencia de quien mira. una cancelada se ve tachada y sin enlace
export function SessionList({ enrollmentId, sessions, lessonLinks = true }: { enrollmentId: string; sessions: Session[]; lessonLinks?: boolean }) {
  const { t, i18n } = useTranslation('classroom')
  const zones = [...new Set(sessions.map((session) => session.timeZone))]
  return (
    <div className="flex flex-col gap-3">
      {zones.length === 1 ? <p className="text-sm text-ink-muted">{t('sessions.timeZone', { zone: timeZoneLabel(zones[0]!, i18n.language) })}</p> : null}
      <ol className="flex flex-col gap-3">
        {[...sessions]
          .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
          .map((session) => (
            <li key={session.id}>
              <SessionItem enrollmentId={enrollmentId} session={session} sessions={sessions} showZone={zones.length > 1} lessonLink={lessonLinks} />
            </li>
          ))}
      </ol>
    </div>
  )
}

function SessionItem({
  enrollmentId,
  session,
  sessions,
  showZone,
  lessonLink
}: {
  enrollmentId: string
  session: Session
  sessions: Session[]
  showZone: boolean
  lessonLink: boolean
}) {
  const { t, i18n } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const cancelled = session.status === 'CANCELADA'
  const original = session.originalSessionId ? sessions.find((candidate) => candidate.id === session.originalSessionId) : undefined
  return (
    <article aria-label={session.title} className="flex flex-col gap-2 rounded-card border border-border px-5 py-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={`text-base font-medium ${cancelled ? 'text-ink-muted line-through' : 'text-ink'}`}>{session.title}</h3>
        {session.status === 'PROGRAMADA' ? null : (
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cancelled ? 'border-danger text-danger' : 'border-border-control text-ink'}`}>
            {t(`sessions.status.${session.status}`)}
          </span>
        )}
      </div>
      <p className="text-ink">
        <time dateTime={session.start}>{formatInstantRange(session.start, session.end, i18n.language, session.timeZone)}</time>
        {showZone ? ` (${timeZoneLabel(session.timeZone, i18n.language)})` : null}
      </p>
      <p className="text-ink-muted">
        {t(`sessions.type.${session.type}`)} · {t(`sessions.modality.${session.modality}`)}
        {session.location ? ` · ${session.location}` : null}
      </p>
      {original ? <p className="text-ink-muted">{t('sessions.recovers', { title: original.title })}</p> : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {!cancelled && session.link && isHttpsUrl(session.link) ? (
          <a
            href={session.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link underline-offset-4 hover:underline"
            aria-label={t('sessions.joinLabel', { title: session.title })}
          >
            {t('sessions.join')}
          </a>
        ) : null}
        {lessonLink && session.lessonId ? (
          <Link
            to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId }, { [LESSON_PARAM]: session.lessonId })}
            className="text-link underline-offset-4 hover:underline"
          >
            {t('sessions.toLesson')}
          </Link>
        ) : null}
        {cancelled ? null : (
          <p className="text-ink">
            <span className="text-ink-muted">{t('sessions.attendance')} </span>
            {session.attendance ? t(`sessions.attendanceStatus.${session.attendance}`) : t('sessions.attendanceNone')}
          </p>
        )}
      </div>
    </article>
  )
}
