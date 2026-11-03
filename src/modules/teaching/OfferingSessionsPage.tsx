import { CHANGE_REASON_MAX_LENGTH, EmptyState, normalizeReason, ReasonDialog, reasonProblem, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button, Dialog, DialogContent, DialogDescription, DialogTitle, Input, Label, Textarea } from '@wasichai/ui'
import { BookOpen, FlaskConical, MapPin, MessageCircleQuestion, RotateCcw, Video, type LucideIcon } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { TEXT_LINK, WRAP } from '../../shared/buttons'
import { Link, useParams } from 'react-router'
import { formatTime, timeZoneLabel, zonedDateTime } from '../../shared/format'
import { Section, Skeleton } from '../../shared/Screen'
import { StatusBadge } from '../../shared/StatusBadge'
import { isHttpsUrl, type Session } from '../../shared/sessions'
import { ReturnFocus, useFocusOnClose } from '../../shared/ReturnFocus'
import { useCancelSession, useOfferings, useOfferingSessions, useRescheduleSession } from './api'
import { OfferingSection } from './OfferingSection'
import { QueryProblem, useActionError, useLeaveDialog } from './parts'
import { TEACHING_ROUTES } from './routes'
import { SessionForm } from './SessionForm'
import { groupByDay, splitSessions } from './sessions'

// las sesiones de una edición: crear una o una serie, reprogramar y cancelar con motivo, y pasar asistencia
export function OfferingSessionsPage() {
  const { code = '' } = useParams()
  // al cambiar de edición con el selector, un formulario abierto no se hereda
  return <OfferingSessions key={code} code={code} />
}

function OfferingSessions({ code }: { code: string }) {
  const { t, i18n } = useTranslation('teaching')
  const query = useOfferingSessions(code)
  const timeZone = useOfferings().data?.find((candidate) => candidate.code === code)?.timeZone
  const [creating, setCreating] = useState(false)
  const newSession = useFocusOnClose<HTMLButtonElement>(creating)
  const [created, setCreated] = useState<number>()
  const [formDirty, setFormDirty] = useState(false)
  const leave = useLeaveDialog(creating && formDirty)
  const sessions = query.data
  const { upcoming, past } = splitSessions(sessions ?? [], Date.now())
  return (
    <OfferingSection code={code} section="sessions" onSwitch={leave.request}>
      {query.isError ? (
        <QueryProblem error={query.error} resource="sessions" onRetry={() => void query.refetch()} />
      ) : !sessions ? (
        <div role="status" className="flex flex-col gap-3">
          <span className="sr-only">{t('sessions.loading')}</span>
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <div className="flex flex-col gap-0.5 text-sm">
              {timeZone ? <p className="text-ink-muted">{t('sessions.timeZone', { zone: timeZoneLabel(timeZone, i18n.language) })}</p> : null}
              <p role="status" className="font-medium text-success empty:hidden">
                {created ? t('sessions.created', { count: created, value: created }) : ''}
              </p>
            </div>
            {!creating && timeZone ? (
              <Button
                ref={newSession}
                className={`${WRAP} min-h-11 px-5`}
                onClick={() => {
                  setCreated(undefined)
                  setCreating(true)
                }}
              >
                {t('sessions.new')}
              </Button>
            ) : null}
          </div>
          {creating && timeZone ? (
            <SessionForm
              code={code}
              timeZone={timeZone}
              sessions={sessions}
              onDirty={setFormDirty}
              onClose={() => setCreating(false)}
              onDone={(count) => {
                setCreated(count)
                setCreating(false)
              }}
            />
          ) : null}
          {sessions.length === 0 ? <EmptyState title={t('sessions.empty')} /> : null}
          <SessionGroup title={t('sessions.upcoming')} sessions={upcoming} past={false} code={code} all={sessions} />
          <SessionGroup title={t('sessions.past')} sessions={past} past code={code} all={sessions} />
        </>
      )}
      {leave.dialog}
    </OfferingSection>
  )
}

function SessionGroup({ title, sessions, past, code, all }: { title: string; sessions: Session[]; past: boolean; code: string; all: Session[] }) {
  const { i18n } = useTranslation('teaching')
  if (sessions.length === 0) return null
  return (
    <Section title={title}>
      <div className="flex flex-col gap-5">
        {groupByDay(sessions).map((group) => (
          <div key={group.date} className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-ink first-letter:uppercase">
              {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'full', timeZone: group.sessions[0]!.timeZone }).format(new Date(group.sessions[0]!.start))}
            </h3>
            <ol className="flex flex-col divide-y divide-border border-y border-border">
              {group.sessions.map((session) => (
                <li key={session.id} className="@container">
                  <SessionItem code={code} session={session} sessions={all} past={past} />
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </Section>
  )
}

const TYPE_ICON: Record<Session['type'], LucideIcon> = { TEORIA: BookOpen, LABORATORIO: FlaskConical, CONSULTA: MessageCircleQuestion, RECUPERACION: RotateCcw }
const MODALITY_ICON: Record<Session['modality'], LucideIcon> = { PRESENCIAL: MapPin, VIRTUAL: Video }

function Fact({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {children}
    </span>
  )
}

// el mismo estado, la misma insignia que en el aula. de una pasada no se dice «Programada»: ya no lo está, y el contrato no dice si se dio
function SessionState({ session, past }: { session: Session; past: boolean }) {
  const { t } = useTranslation('teaching')
  if (session.status === 'CANCELADA') return <StatusBadge state="overdue">{t('sessions.status.CANCELADA')}</StatusBadge>
  const running = !past && Date.parse(session.start) <= Date.now()
  if (running) return <StatusBadge state="active">{t('panel.agenda.running')}</StatusBadge>
  if (session.status === 'REPROGRAMADA') return <StatusBadge state="warning">{t('sessions.status.REPROGRAMADA')}</StatusBadge>
  return past ? null : <StatusBadge state="todo">{t('sessions.status.PROGRAMADA')}</StatusBadge>
}

function SessionItem({ code, session, sessions, past }: { code: string; session: Session; sessions: Session[]; past: boolean }) {
  const { t, i18n } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const locale = i18n.language
  const [dialog, setDialog] = useState<'reschedule' | 'cancel'>()
  const cancelled = session.status === 'CANCELADA'
  const original = session.originalSessionId ? sessions.find((candidate) => candidate.id === session.originalSessionId) : undefined
  const attendance = links.to(TEACHING_ROUTES.attendance, { code, sessionId: session.id })
  return (
    <article aria-label={session.title} className="flex flex-col gap-3 py-3 text-sm @3xl:flex-row @3xl:items-start @3xl:justify-between @3xl:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h4 className={`text-base font-medium break-words ${cancelled ? 'text-ink-muted line-through' : 'text-ink'}`}>{session.title}</h4>
          <SessionState session={session} past={past} />
        </div>
        <p className="text-ink tabular-nums">
          <time dateTime={session.start}>{`${formatTime(session.start, locale, session.timeZone)}–${formatTime(session.end, locale, session.timeZone)}`}</time>
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-ink-muted">
          <Fact icon={TYPE_ICON[session.type]}>{t(`sessions.type.${session.type}`)}</Fact>
          <Fact icon={MODALITY_ICON[session.modality]}>{t(`sessions.modality.${session.modality}`)}</Fact>
          {session.location ? <span className="break-words">{session.location}</span> : null}
        </div>
        {original ? <p className="text-ink-muted">{t('sessions.recovers', { title: original.title })}</p> : null}
        {!cancelled && session.link && isHttpsUrl(session.link) ? (
          <a
            href={session.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`${TEXT_LINK} self-start`}
            aria-label={t('sessions.joinLabel', { title: session.title })}
          >
            {t('sessions.join')}
          </a>
        ) : null}
      </div>
      {cancelled ? null : (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button className={WRAP} asChild size="sm" variant="secondary">
            <Link to={attendance} aria-label={t('sessions.attendanceLabel', { title: session.title })}>
              {t('sessions.attendance')}
            </Link>
          </Button>
          <Button
            className={WRAP}
            size="sm"
            variant="secondary"
            onClick={() => setDialog('reschedule')}
            aria-label={t('sessions.rescheduleLabel', { title: session.title })}
          >
            {t('sessions.reschedule')}
          </Button>
          <Button
            className={WRAP}
            size="sm"
            variant="ghost"
            onClick={() => setDialog('cancel')}
            aria-label={t('sessions.cancelLabel', { title: session.title })}
          >
            {t('sessions.cancel')}
          </Button>
        </div>
      )}
      {dialog === 'reschedule' ? <RescheduleDialog code={code} session={session} onClose={() => setDialog(undefined)} /> : null}
      {dialog === 'cancel' ? <CancelDialog code={code} session={session} onClose={() => setDialog(undefined)} /> : null}
    </article>
  )
}

// cancelar es destructivo y avisa a los matriculados: se confirma con el diálogo de motivo de core (RNF-UX-08)
function CancelDialog({ code, session, onClose }: { code: string; session: Session; onClose: () => void }) {
  const { t } = useTranslation('teaching')
  const describe = useActionError()
  const cancel = useCancelSession(code, session.id)
  return (
    <ReturnFocus>
      <ReasonDialog
        title={t('cancel.title', { title: session.title })}
        description={t('cancel.description')}
        confirmLabel={t('cancel.confirm')}
        busy={cancel.isPending}
        error={cancel.error ? describe(cancel.error) : null}
        onCancel={onClose}
        onConfirm={(reason) => cancel.mutate(reason, { onSuccess: onClose })}
      />
    </ReturnFocus>
  )
}

// reprogramar lleva la nueva fecha y hora, en la zona de la edición, además del motivo; también avisa a los matriculados
function RescheduleDialog({ code, session, onClose }: { code: string; session: Session; onClose: () => void }) {
  const { t, i18n } = useTranslation('teaching')
  const id = useId()
  const describe = useActionError()
  const reschedule = useRescheduleSession(code, session.id)
  const current = zonedDateTime(session.start, session.timeZone)
  const [date, setDate] = useState(current.date)
  const [time, setTime] = useState(current.time)
  const [reason, setReason] = useState('')
  const [invalid, setInvalid] = useState<'when' | 'reason'>()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const problem = !date || !time ? 'when' : reasonProblem(reason) ? 'reason' : undefined
    setInvalid(problem)
    if (problem) return
    reschedule.mutate({ date, localTime: time, reason: normalizeReason(reason) ?? '' }, { onSuccess: onClose })
  }
  return (
    <ReturnFocus>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-lg font-semibold">{t('reschedule.title', { title: session.title })}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-ink-muted">
            {t('reschedule.description', { zone: timeZoneLabel(session.timeZone, i18n.language) })}
          </DialogDescription>
          <form noValidate onSubmit={submit} className="mt-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor={`${id}-date`}>{t('reschedule.date')}</Label>
                <Input
                  id={`${id}-date`}
                  type="date"
                  value={date}
                  aria-invalid={invalid === 'when' && !date ? true : undefined}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`${id}-time`}>{t('reschedule.time')}</Label>
                <Input
                  id={`${id}-time`}
                  type="time"
                  value={time}
                  aria-invalid={invalid === 'when' && !time ? true : undefined}
                  onChange={(event) => setTime(event.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-reason`}>{t('reschedule.reason')}</Label>
              <Textarea
                id={`${id}-reason`}
                rows={2}
                value={reason}
                aria-invalid={invalid === 'reason' ? true : undefined}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            {invalid ? (
              <p role="alert" className="text-sm text-danger">
                {invalid === 'when' ? t('reschedule.whenRequired') : t('reason.invalid', { max: CHANGE_REASON_MAX_LENGTH })}
              </p>
            ) : null}
            {reschedule.error ? <Alert tone="danger">{describe(reschedule.error)}</Alert> : null}
            <div className="mt-2 flex justify-end gap-2">
              <Button className={WRAP} type="button" variant="secondary" onClick={onClose}>
                {t('reschedule.dismiss')}
              </Button>
              <Button className={WRAP} type="submit" disabled={reschedule.isPending}>
                {reschedule.isPending ? t('reschedule.saving') : t('reschedule.confirm')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </ReturnFocus>
  )
}
