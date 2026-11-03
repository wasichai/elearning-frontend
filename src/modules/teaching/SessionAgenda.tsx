import { useWasichaiLinks } from '@wasichai/core'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatSessionStart, timeZoneLabel } from '../../shared/format'
import { Section, Skeleton } from '../../shared/Screen'
import type { Session } from '../../shared/sessions'
import { StatusBadge } from '../../shared/StatusBadge'
import type { TeachingOffering, TeachingPanelItem } from './contract'
import { MAX_AGENDA_ROWS, panelAgenda } from './panel'
import { BlockProblem } from './parts'
import { TEACHING_ROUTES } from './routes'

type AgendaSession = Session & { offering: TeachingOffering }

const ROW_LINK =
  'flex min-h-11 flex-col gap-0.5 py-2.5 text-sm break-words transition-colors duration-[160ms] hover:bg-surface-muted motion-reduce:transition-none'

// la agenda «Próximas sesiones» de las ediciones vivas. sale del panel: si no se pudo leer, lo dice y lo demás se ve igual
export function SessionAgenda({ items, loading, failed, onRetry }: { items: TeachingPanelItem[]; loading: boolean; failed: boolean; onRetry: () => void }) {
  const { t, i18n } = useTranslation('teaching')
  const locale = i18n.language
  const now = Date.now()
  const sessions = panelAgenda(items, now)
  const shown = sessions.slice(0, MAX_AGENDA_ROWS)
  const hidden = sessions.length - shown.length
  const zones = [...new Set(shown.map((session) => session.timeZone))]
  return (
    <Section title={t('panel.agenda.title')} description={zones.length === 1 ? t('sessions.timeZone', { zone: timeZoneLabel(zones[0]!, locale) }) : undefined}>
      {failed ? <BlockProblem text={t('panel.agenda.failed')} retryLabel={t('panel.agenda.retry')} onRetry={onRetry} /> : null}
      {loading ? (
        <div role="status" className="flex flex-col gap-3">
          <span className="sr-only">{t('sessions.loading')}</span>
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : null}
      {shown.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {shown.map((session) => (
            <li key={`${session.offering.code}-${session.id}`}>
              <AgendaRow session={session} now={now} showZone={zones.length > 1} />
            </li>
          ))}
        </ul>
      ) : null}
      {hidden > 0 ? <p className="text-sm text-ink-muted">{t('panel.agenda.more', { count: hidden })}</p> : null}
      {!loading && !failed && sessions.length === 0 ? <p className="text-sm text-ink-muted">{t('panel.agenda.none')}</p> : null}
    </Section>
  )
}

// una sesión ya empezada lleva a pasar asistencia, que es lo que toca; una por venir, a las sesiones de su edición
function AgendaRow({ session, now, showZone }: { session: AgendaSession; now: number; showZone: boolean }) {
  const { t, i18n } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const locale = i18n.language
  const code = session.offering.code
  const running = Date.parse(session.start) <= now
  const to = running ? links.to(TEACHING_ROUTES.attendance, { code, sessionId: session.id }) : links.to(TEACHING_ROUTES.sessions, { code })
  return (
    <Link to={to} className={ROW_LINK}>
      <span className="font-medium text-ink">{session.title}</span>
      <time dateTime={session.start} className="text-ink">
        {formatSessionStart(session.start, locale, session.timeZone)}
      </time>
      {showZone ? <span className="text-ink-muted">{timeZoneLabel(session.timeZone, locale)}</span> : null}
      <span className="text-ink-muted">{session.offering.course.title}</span>
      {running ? (
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusBadge state="active">{t('panel.agenda.running')}</StatusBadge>
          <span className="font-medium text-link">{t('panel.agenda.toAttendance')}</span>
        </span>
      ) : session.status === 'REPROGRAMADA' ? (
        <span className="mt-1 flex">
          <StatusBadge state="warning">{t('sessions.status.REPROGRAMADA')}</StatusBadge>
        </span>
      ) : null}
    </Link>
  )
}
