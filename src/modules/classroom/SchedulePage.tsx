import { EmptyState, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { formatTime, formatTimeRange, timeZoneLabel } from '../../shared/format'
import { ListSkeleton } from '../../shared/ListSkeleton'
import { ProblemState } from '../../shared/ProblemState'
import { ScreenBody, Section } from '../../shared/Screen'
import { useAgenda, type AgendaSession } from './agenda'
import { useClassroomPanel } from './api'
import { groupEnrollments, railAssessments, railEnrollments } from './dashboard'
import { AssessmentsBlock } from './DashboardRail'
import { useProblemText } from './parts'
import { CLASSROOM_ROUTES, WEEK_PARAM } from './routes'
import {
  addDays,
  civilNoon,
  localToday,
  parseWeek,
  placements,
  scheduleDays,
  scheduleRange,
  timeline,
  useScheduleView,
  type ScheduleDay,
  type ScheduleView
} from './schedule'
import { SessionRow } from './SessionRow'

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'
// los controles de la cabecera (.b-ghost y .seg-b del artboard): tinta sobre filete de control, 44 px
const CONTROL = `inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md border px-4 text-label ${FOCUS}`
const IDLE = 'border-border-control bg-surface text-ink hover:bg-table-head'

// la altura de una hora en la rejilla, en rem (media hora, 2rem: el título de una sesión de 30 minutos cabe en una línea)
const HOUR_REM = 4

const sessionKey = (session: AgendaSession) => `${session.enrollmentId}-${session.id}`
const anchorOf = (session: AgendaSession) => `sesion-${sessionKey(session)}`
// el bloque de la rejilla lleva al detalle de su sesión, en la misma página
const fragmentOf = (session: AgendaSession) => `#${anchorOf(session)}`

// «Horario» (docs/design-system/colofon/Schedule.dc.html): la semana del estudiante, de lunes a domingo, con las sesiones de todas sus
// matrículas no retiradas en la zona de su edición. la semana va en la URL (?semana=<lunes>), que se comparte y que atrás/adelante recorren.
// dos vistas: la rejilla de la semana con el detalle debajo, o la lista por días; a 390 px solo la lista. al lado, lo que queda por hacer
export function SchedulePage() {
  const { t, i18n } = useTranslation('classroom')
  const [params] = useSearchParams()
  const [now] = useState(() => Date.now())
  const today = localToday(now)
  const monday = parseWeek(params.get(WEEK_PARAM), now)
  const range = useMemo(() => scheduleRange(monday), [monday])
  const agenda = useAgenda(range)
  const panel = useClassroomPanel()
  const [view, setView] = useScheduleView()
  const days = useMemo(() => (agenda.data ? scheduleDays(agenda.data, monday) : undefined), [agenda.data, monday])
  const sessions = days?.flatMap((day) => day.sessions) ?? []
  const zones = [...new Set(sessions.map((session) => session.timeZone))]
  const active = useMemo(() => railEnrollments(groupEnrollments(panel.data ?? [])), [panel.data])
  const assessments = panel.data ? railAssessments(active, panel.data) : []
  return (
    <ScreenBody className="gap-8">
      <ScheduleHeader monday={monday} today={today} zone={zones.length === 1 ? zones[0] : undefined} view={view} onView={setView} />
      <div className="grid grid-cols-1 items-start gap-10 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
        <div className="flex min-w-0 flex-col gap-10">
          {agenda.isError ? (
            <AgendaProblem error={agenda.error} onRetry={() => void agenda.refetch()} />
          ) : !days ? (
            <ListSkeleton label={t('schedule.loading')} />
          ) : sessions.length === 0 ? (
            <EmptyState title={t('schedule.empty')} icon={CalendarDays}>
              <p>{t('schedule.emptyHint')}</p>
            </EmptyState>
          ) : (
            <Week days={days} today={today} now={now} view={view} showZone={zones.length > 1} locale={i18n.language} />
          )}
        </div>
        <aside aria-label={t('schedule.aside')} className="grid min-w-0 grid-cols-1 gap-10 md:grid-cols-2 xl:grid-cols-1">
          <div className="flex min-w-0 flex-col gap-3">
            <AssessmentsBlock block={{ items: assessments, loading: panel.isPending, failed: panel.isError, retry: () => void panel.refetch() }} />
            {/* las evaluaciones no tienen fecha en el contrato: son todas las que quedan, no las de esta semana, y se dice */}
            {assessments.length > 0 ? <p className="text-secondary text-ink-muted">{t('schedule.pendingNote')}</p> : null}
          </div>
          {view === 'week' && sessions.length > 0 ? <Legend /> : null}
        </aside>
      </div>
    </ScreenBody>
  )
}

function weekTitle(monday: string, locale: string) {
  const sunday = addDays(monday, 6)
  const sameMonth = monday.slice(0, 7) === sunday.slice(0, 7)
  const sameYear = monday.slice(0, 4) === sunday.slice(0, 4)
  const format = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(civilNoon(date))
  const year = sameYear ? {} : { year: 'numeric' as const }
  return {
    start: format(monday, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'long', ...year }),
    end: format(sunday, { day: 'numeric', month: 'long', ...year }),
    range: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', ...year, timeZone: 'UTC' }).formatRange(civilNoon(monday), civilNoon(sunday))
  }
}

function ScheduleHeader({
  monday,
  today,
  zone,
  view,
  onView
}: {
  monday: string
  today: string
  zone?: string
  view: ScheduleView
  onView: (view: ScheduleView) => void
}) {
  const { t, i18n } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const week = (date: string) => links.to(CLASSROOM_ROUTES.schedule, {}, { [WEEK_PARAM]: date })
  const current = parseWeek(today, 0) === monday
  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ink pb-2">
        <p className="meta text-ink">{t('schedule.context')}</p>
        {zone ? <p className="meta">{t('sessions.timeZone', { zone: timeZoneLabel(zone, i18n.language) })}</p> : null}
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-read text-h1 text-balance text-ink max-sm:text-h2">{t('schedule.week', weekTitle(monday, i18n.language))}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label={t('schedule.weeks')} className="flex items-center gap-2">
            <Link to={week(addDays(monday, -7))} aria-label={t('schedule.previous')} className={`${CONTROL} ${IDLE} px-0`}>
              <ChevronLeft aria-hidden="true" className="size-5" />
            </Link>
            <Link to={links.to(CLASSROOM_ROUTES.schedule)} aria-current={current ? 'date' : undefined} className={`${CONTROL} ${IDLE}`}>
              {t('schedule.today')}
            </Link>
            <Link to={week(addDays(monday, 7))} aria-label={t('schedule.next')} className={`${CONTROL} ${IDLE} px-0`}>
              <ChevronRight aria-hidden="true" className="size-5" />
            </Link>
          </nav>
          {/* a 390 px solo hay lista: la elección no se ofrece */}
          <div role="group" aria-label={t('schedule.view')} className="flex max-md:hidden md:ml-2">
            {(['week', 'list'] as const).map((option, index) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => onView(option)}
                className={`${CONTROL} ${index === 0 ? 'rounded-r-none' : '-ml-px rounded-l-none'} ${
                  view === option ? 'border-brand bg-brand font-semibold text-on-brand' : IDLE
                }`}
              >
                {t(option === 'week' ? 'schedule.viewWeek' : 'schedule.viewList')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}

function AgendaProblem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('classroom')
  const { title, description, technical } = useProblemText(error, 'sessions')
  return (
    <ProblemState title={title} description={description} technical={technical}>
      <Button variant="secondary" onClick={onRetry}>
        {t('problem.retry')}
      </Button>
    </ProblemState>
  )
}

interface WeekProps {
  days: ScheduleDay[]
  today: string
  now: number
  view: ScheduleView
  showZone: boolean
  locale: string
}

// la vista elegida. con «Semana», la rejilla y el detalle se ven desde tableta y la lista los sustituye en un móvil
function Week(props: WeekProps) {
  if (props.view === 'list') return <DayList {...props} />
  return (
    <>
      <div className="flex min-w-0 flex-col gap-10 max-md:hidden">
        <WeekGrid {...props} />
        <WeekDetails {...props} />
      </div>
      <div className="md:hidden">
        <DayList {...props} />
      </div>
    </>
  )
}

function dayName(date: string, locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(civilNoon(date)).replace('.', '')
}

function formatHour(hour: number, locale: string) {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone: 'UTC' }).format(Date.UTC(2026, 0, 1, hour))
}

const BLOCK_TONE: Record<AgendaSession['status'], string> = {
  PROGRAMADA: 'border border-brand bg-brand text-on-brand',
  REPROGRAMADA: 'border-2 border-dashed border-warning bg-warning-soft text-ink',
  // tachada y sin relleno: rayas de danger-soft sobre la superficie, con su filete
  CANCELADA: 'border border-danger bg-surface bg-[repeating-linear-gradient(135deg,transparent_0_5px,var(--danger-soft)_5px_8px)] text-danger line-through'
}

// la rejilla: una columna por día y las horas que ocupan las sesiones de la semana. cada sesión, en su carril si se pisa con otra, enlaza a
// su detalle; la palabra de su estado va en su nombre accesible (y a la vista, si no es la de siempre)
function WeekGrid({ days, today, locale }: WeekProps) {
  const { t } = useTranslation('classroom')
  const { first, last } = timeline(days)
  const height = `${(last - first) * HOUR_REM}rem`
  const hours = Array.from({ length: last - first }, (_, index) => first + index)
  return (
    <div className="border-t border-ink bg-surface">
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
        <span aria-hidden="true" className="border-b border-ink" />
        {days.map(({ date }) => {
          const isToday = date === today
          return (
            <div
              key={date}
              aria-hidden="true"
              className={`flex min-w-0 flex-col border-b border-ink px-2.5 pt-2.5 pb-2 ${isToday ? 'bg-brand-soft text-brand' : 'text-ink'}`}
            >
              <span className={`meta ${isToday ? 'text-brand' : ''}`}>
                {dayName(date, locale, { weekday: 'short' })}
                {isToday ? ` · ${t('schedule.todayMark')}` : ''}
              </span>
              <span className="text-h4 font-sans font-semibold tabular-nums">{dayName(date, locale, { day: 'numeric' })}</span>
            </div>
          )
        })}
        {first > 0 ? (
          <p className="text-secondary col-span-7 col-start-2 border-b border-dashed border-border px-2 py-1 text-ink-muted">
            {t('schedule.nothingBefore', { time: formatHour(first, locale) })}
          </p>
        ) : null}
        <div aria-hidden="true" className="relative" style={{ height }}>
          {hours.map((hour, index) => (
            <span key={hour} className="text-secondary absolute right-2 pt-0.5 text-ink-muted tabular-nums" style={{ top: `${index * HOUR_REM}rem` }}>
              {formatHour(hour, locale)}
            </span>
          ))}
        </div>
        {days.map((day) => (
          <ol
            key={day.date}
            aria-label={dayName(day.date, locale, { weekday: 'long', day: 'numeric', month: 'long' })}
            className={`relative min-w-0 border-l border-border bg-[linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] last:border-r ${
              day.date === today ? 'bg-surface-muted' : ''
            }`}
            style={{ height, backgroundSize: `100% ${HOUR_REM}rem` }}
          >
            {placements(day.sessions).map(({ session, start, end, lane, lanes }) => {
              const hoursText = formatTimeRange(session.start, session.end, locale, session.timeZone)
              const status = t(`sessions.status.${session.status}`)
              const short = end - start <= 45
              // en un bloque corto o estrecho (se pisa con otra), solo la hora de inicio: el tramo entero va en su nombre y en el detalle
              const startOnly = short || lanes > 1
              // el título ocupa varias líneas solo si hay sitio (hora y media o más, a todo el ancho del día); si no, una, con elipsis
              const roomy = end - start >= 90 && lanes === 1
              return (
                <li
                  key={sessionKey(session)}
                  className="absolute p-0.5"
                  style={{
                    top: `${((start - first * 60) / 60) * HOUR_REM}rem`,
                    height: `${((end - start) / 60) * HOUR_REM}rem`,
                    left: `${(lane / lanes) * 100}%`,
                    width: `${100 / lanes}%`
                  }}
                >
                  <a
                    href={fragmentOf(session)}
                    aria-label={t('schedule.block', { hours: hoursText, title: session.title, status })}
                    title={session.title}
                    className={`flex h-full min-w-0 overflow-hidden rounded-md px-2 py-1 text-[0.8125rem] leading-tight ${FOCUS} ${BLOCK_TONE[session.status]} ${
                      short ? 'flex-row items-center gap-1.5' : 'flex-col gap-0.5'
                    }`}
                  >
                    <span className="shrink-0 font-semibold tabular-nums">{startOnly ? formatTime(session.start, locale, session.timeZone) : hoursText}</span>
                    <span className={roomy ? 'line-clamp-3' : 'truncate'}>{session.title}</span>
                    {session.status === 'PROGRAMADA' || short ? null : <span className="truncate font-semibold no-underline">{status}</span>}
                  </a>
                </li>
              )
            })}
          </ol>
        ))}
      </div>
    </div>
  )
}

// el detalle de cada sesión de la semana bajo la rejilla, por inicio: a donde lleva cada bloque
function WeekDetails({ days, now, showZone }: WeekProps) {
  const { t } = useTranslation('classroom')
  const sessions = days.flatMap((day) => day.sessions)
  return (
    <Section title={t('schedule.details')} action={t('schedule.count', { count: sessions.length })}>
      <ul className="-mt-3 flex flex-col divide-y divide-border border-b border-border">
        {sessions.map((session) => (
          <li key={sessionKey(session)} className="py-4">
            <ScheduleRow session={session} now={now} showZone={showZone} sessions={sessions} withDate />
          </li>
        ))}
      </ul>
    </Section>
  )
}

function ScheduleRow({
  session,
  sessions,
  now,
  showZone,
  withDate = false
}: {
  session: AgendaSession
  sessions: AgendaSession[]
  now: number
  showZone: boolean
  withDate?: boolean
}) {
  const original = session.originalSessionId
    ? sessions.find((candidate) => candidate.enrollmentId === session.enrollmentId && candidate.id === session.originalSessionId)
    : undefined
  return (
    <SessionRow
      id={withDate ? anchorOf(session) : undefined}
      enrollmentId={session.enrollmentId}
      session={session}
      now={now}
      original={original}
      showZone={showZone}
      lessonLink
      course={session.courseTitle}
      withDate={withDate}
      scheduledBadge
    />
  )
}

// la lista: los siete días, cada uno con sus sesiones o con lo que dice que no hay ninguna. el día encima en un móvil, a la izquierda desde sm
function DayList({ days, today, now, showZone, locale }: WeekProps) {
  const { t } = useTranslation('classroom')
  const sessions = days.flatMap((day) => day.sessions)
  return (
    <ol className="flex flex-col border-t border-ink bg-surface px-4 sm:px-5">
      {days.map((day) => {
        const isToday = day.date === today
        return (
          <li key={day.date} className="grid grid-cols-1 gap-x-4 gap-y-2 border-b border-border py-4 last:border-b-0 sm:grid-cols-[6rem_minmax(0,1fr)]">
            <h2
              className={`meta ${isToday ? 'text-brand' : ''}`}
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${dayName(day.date, locale, { weekday: 'long', day: 'numeric', month: 'long' })}${isToday ? ` · ${t('schedule.todayMark')}` : ''}`}
            >
              {dayName(day.date, locale, { weekday: 'short', day: 'numeric' })}
              {isToday ? ` · ${t('schedule.todayMark')}` : ''}
            </h2>
            {day.sessions.length === 0 ? (
              <p className="text-secondary text-ink-muted">{t('schedule.noneDay')}</p>
            ) : (
              <ul className="flex min-w-0 flex-col divide-y divide-border">
                {day.sessions.map((session) => (
                  <li key={sessionKey(session)} className="py-3 first:pt-0 last:pb-0">
                    <ScheduleRow session={session} sessions={sessions} now={now} showZone={showZone} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ol>
  )
}

// cómo leer la rejilla: cada estado con su muestra y su palabra
function Legend() {
  const { t } = useTranslation('classroom')
  const item = (status: AgendaSession['status'], children: ReactNode) => (
    <li className="text-secondary flex items-center gap-2.5 text-ink">
      <span aria-hidden="true" className={`h-5.5 w-11 shrink-0 rounded-md ${BLOCK_TONE[status]}`} />
      <span>{children}</span>
    </li>
  )
  return (
    <Section title={t('schedule.legend')} className="max-md:hidden">
      <ul className="flex flex-col gap-2.5">
        {item('PROGRAMADA', <strong className="font-semibold">{t('sessions.status.PROGRAMADA')}</strong>)}
        {item(
          'REPROGRAMADA',
          <>
            <strong className="font-semibold text-warning">{t('sessions.status.REPROGRAMADA')}</strong>
            {t('schedule.legendRescheduled')}
          </>
        )}
        {item(
          'CANCELADA',
          <>
            <strong className="font-semibold text-danger line-through">{t('sessions.status.CANCELADA')}</strong>
            {t('schedule.legendCancelled')}
          </>
        )}
      </ul>
    </Section>
  )
}
