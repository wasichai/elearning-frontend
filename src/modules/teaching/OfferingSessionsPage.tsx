import { CHANGE_REASON_MAX_LENGTH, LoadingState, normalizeReason, ReasonDialog, reasonProblem, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button, Dialog, DialogContent, DialogDescription, DialogTitle, Input, Label, Textarea } from '@wasichai/ui'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { WRAP } from '../../shared/buttons'
import { Link, useParams } from 'react-router'
import { formatInstantRange, timeZoneLabel, zonedDateTime } from '../../shared/format'
import { isHttpsUrl, type Session } from '../../shared/sessions'
import { useCancelSession, useOfferings, useOfferingSessions, useRescheduleSession } from './api'
import { OfferingFrame, QueryProblem, useActionError } from './parts'
import { TEACHING_ROUTES } from './routes'
import { SessionForm } from './SessionForm'

// las sesiones de una edición: crear una o una serie, reprogramar y cancelar con motivo, y pasar asistencia
export function OfferingSessionsPage() {
  const { t, i18n } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const { code = '' } = useParams()
  const query = useOfferingSessions(code)
  const timeZone = useOfferings().data?.find((candidate) => candidate.code === code)?.timeZone
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<number>()
  const sessions = query.data ? [...query.data].sort((a, b) => Date.parse(a.start) - Date.parse(b.start)) : undefined
  return (
    <OfferingFrame code={code} subtitle={t('sessions.title')} back={links.to(TEACHING_ROUTES.roster, { code })} backLabel={t('queue.back')}>
      {query.isError ? (
        <QueryProblem error={query.error} resource="sessions" onRetry={() => void query.refetch()} />
      ) : !sessions ? (
        <LoadingState label={t('sessions.loading')} />
      ) : (
        <div className="flex flex-col gap-5">
          <p role="status" className="text-sm text-success">
            {created ? t('sessions.created', { count: created, value: created }) : ''}
          </p>
          {timeZone ? <p className="text-sm text-ink-muted">{t('sessions.timeZone', { zone: timeZoneLabel(timeZone, i18n.language) })}</p> : null}
          {creating && timeZone ? (
            <SessionForm
              code={code}
              timeZone={timeZone}
              sessions={sessions}
              onDone={(count) => {
                setCreated(count)
                setCreating(false)
              }}
            />
          ) : timeZone ? (
            <Button
              variant="secondary"
              className={`self-start ${WRAP}`}
              onClick={() => {
                setCreated(undefined)
                setCreating(true)
              }}
            >
              {t('sessions.new')}
            </Button>
          ) : null}
          {sessions.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('sessions.empty')}</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {sessions.map((session) => (
                <li key={session.id}>
                  <SessionItem code={code} session={session} sessions={sessions} />
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </OfferingFrame>
  )
}

function SessionItem({ code, session, sessions }: { code: string; session: Session; sessions: Session[] }) {
  const { t, i18n } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const [dialog, setDialog] = useState<'reschedule' | 'cancel'>()
  const cancelled = session.status === 'CANCELADA'
  const original = session.originalSessionId ? sessions.find((candidate) => candidate.id === session.originalSessionId) : undefined
  return (
    <article aria-label={session.title} className="flex flex-col gap-2 rounded-card border border-border px-5 py-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={`text-base font-medium ${cancelled ? 'text-ink-muted line-through' : 'text-ink'}`}>{session.title}</h2>
        {session.status === 'PROGRAMADA' ? null : (
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cancelled ? 'border-danger text-danger' : 'border-border-control text-ink'}`}>
            {t(`sessions.status.${session.status}`)}
          </span>
        )}
      </div>
      <p className="text-ink">
        <time dateTime={session.start}>{formatInstantRange(session.start, session.end, i18n.language, session.timeZone)}</time>
      </p>
      <p className="text-ink-muted">
        {t(`sessions.type.${session.type}`)} · {t(`sessions.modality.${session.modality}`)}
        {session.location ? ` · ${session.location}` : null}
      </p>
      {original ? <p className="text-ink-muted">{t('sessions.recovers', { title: original.title })}</p> : null}
      {!cancelled && session.link && isHttpsUrl(session.link) ? (
        <a
          href={session.link}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-link underline-offset-4 hover:underline"
          aria-label={t('sessions.joinLabel', { title: session.title })}
        >
          {t('sessions.join')}
        </a>
      ) : null}
      {cancelled ? null : (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button className={WRAP} asChild size="sm" variant="secondary">
            <Link
              to={links.to(TEACHING_ROUTES.attendance, { code, sessionId: session.id })}
              aria-label={t('sessions.attendanceLabel', { title: session.title })}
            >
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
    <ReasonDialog
      title={t('cancel.title', { title: session.title })}
      description={t('cancel.description')}
      confirmLabel={t('cancel.confirm')}
      busy={cancel.isPending}
      error={cancel.error ? describe(cancel.error) : null}
      onCancel={onClose}
      onConfirm={(reason) => cancel.mutate(reason, { onSuccess: onClose })}
    />
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
              <Input id={`${id}-date`} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-time`}>{t('reschedule.time')}</Label>
              <Input id={`${id}-time`} type="time" value={time} onChange={(event) => setTime(event.target.value)} />
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
  )
}
