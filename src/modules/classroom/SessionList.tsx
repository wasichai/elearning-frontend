import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { timeZoneLabel, zonedDateTime } from '../../shared/format'
import type { Session } from '../../shared/sessions'
import { useNow } from '../../shared/useNow'
import { SessionRow } from './SessionRow'

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
  const now = useNow()
  const zones = [...new Set(sessions.map((session) => session.timeZone))]
  const ended = (session: Session) => now >= Date.parse(session.end)
  const upcoming = sessions.filter((session) => !ended(session)).sort(byStart)
  const past = sessions.filter(ended).sort(byStart).reverse()
  const group = (list: Session[]) => (
    <ol className="flex flex-col divide-y divide-border">
      {daysOf(list).map((day) => (
        <li key={day.key}>
          <DayGroup day={day} level={headingLevel + 1}>
            {day.sessions.map((session) => (
              <li key={session.id} className="py-3 first:pt-0 last:pb-0">
                <SessionRow
                  enrollmentId={enrollmentId}
                  session={session}
                  now={now}
                  original={session.originalSessionId ? sessions.find((candidate) => candidate.id === session.originalSessionId) : undefined}
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
      {zones.length === 1 ? <p className="text-secondary text-ink-muted">{t('sessions.timeZone', { zone: timeZoneLabel(zones[0]!, i18n.language) })}</p> : null}
      <AgendaGroup title={t('sessions.upcoming')} level={headingLevel}>
        {upcoming.length > 0 ? group(upcoming) : <p className="text-secondary text-ink-muted">{t('sessions.noneUpcoming')}</p>}
      </AgendaGroup>
      {past.length > 0 ? (
        <AgendaGroup title={t('sessions.past')} level={headingLevel}>
          {group(past)}
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
      <Heading id={id} className="border-b border-border pb-2 text-h4 text-ink">
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
      <Heading className="text-secondary sm:w-48 sm:shrink-0 sm:pt-0.5">
        <span className="inline-block font-semibold text-ink first-letter:uppercase sm:block">{format({ weekday: 'long' })}</span>{' '}
        <span className="text-ink-muted sm:block">{format({ day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </Heading>
      <ul className="flex min-w-0 flex-1 flex-col divide-y divide-border">{children}</ul>
    </div>
  )
}
