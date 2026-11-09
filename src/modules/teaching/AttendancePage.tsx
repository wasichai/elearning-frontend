import { CHANGE_REASON_MAX_LENGTH, EmptyState, normalizeReason, reasonProblem, useWasichaiLinks } from '@wasichai/core'
import { Button, Label, Textarea } from '@wasichai/ui'
import { Check, Clock, Info, UserCheck, X, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { WRAP } from '../../shared/buttons'
import { formatInstantRange, formatNumber, timeZoneLabel } from '../../shared/format'
import { Notice } from '../../shared/Notice'
import { Skeleton, Stat, StatList } from '../../shared/Screen'
import { ATTENDANCE_STATUSES, type AttendanceStatus } from '../../shared/sessions'
import { useAttendance, useOfferingSessions, useSaveAttendance } from './api'
import type { AttendanceRow } from './contract'
import { OfferingFrame, QueryProblem, STICKY_BAR, useActionError, useLeaveDialog, Submitter, submitterOf } from './parts'
import { TEACHING_ROUTES } from './routes'
import { attendanceSummary, markAllPresent, type AttendanceOverrides } from './sessions'

// icono y palabra en cada botón: el color nunca va solo (AttendanceList). los pares de tono y fondo los comprueba colofon.test.ts en AA
const LOOK: Record<AttendanceStatus, { icon: LucideIcon; pressed: string }> = {
  PRESENTE: { icon: Check, pressed: 'border-success bg-success-soft text-success' },
  TARDE: { icon: Clock, pressed: 'border-warning bg-warning-soft text-warning' },
  AUSENTE: { icon: X, pressed: 'border-danger bg-danger-soft text-danger' },
  JUSTIFICADO: { icon: Info, pressed: 'border-notice bg-notice-soft text-notice' }
}

// pasar asistencia de una sesión. no toca el progreso de materiales (ADR-0016)
export function AttendancePage() {
  const { t, i18n } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const { code = '', sessionId = '' } = useParams()
  const session = useOfferingSessions(code).data?.find((candidate) => candidate.id === sessionId)
  const query = useAttendance(sessionId)
  const [dirty, setDirty] = useState(false)
  const leave = useLeaveDialog(dirty)
  const back = links.to(TEACHING_ROUTES.sessions, { code })
  return (
    <OfferingFrame code={code} subtitle={session?.title ?? t('attendance.title')} back={back} backLabel={t('attendance.back')}>
      {session ? (
        <p className="text-secondary text-ink-muted">
          {formatInstantRange(session.start, session.end, i18n.language, session.timeZone)} ({timeZoneLabel(session.timeZone, i18n.language)})
        </p>
      ) : null}
      {session?.status === 'CANCELADA' ? <Notice tone="notice">{t('attendance.cancelled')}</Notice> : null}
      {query.isError ? (
        <QueryProblem error={query.error} resource="attendance" onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <AttendanceSkeleton />
      ) : query.data.length === 0 ? (
        <EmptyState title={t('attendance.empty')} icon={UserCheck} />
      ) : (
        <AttendanceForm key={sessionId} code={code} sessionId={sessionId} rows={query.data} onDirty={setDirty} />
      )}
      {leave.dialog}
    </OfferingFrame>
  )
}

function AttendanceSkeleton() {
  const { t } = useTranslation('teaching')
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">{t('attendance.loading')}</span>
      <Skeleton className="h-14 w-full max-w-lg" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

function AttendanceForm({ code, sessionId, rows, onDirty }: { code: string; sessionId: string; rows: AttendanceRow[]; onDirty: (dirty: boolean) => void }) {
  const { t, i18n } = useTranslation('teaching')
  const locale = i18n.language
  const id = useId()
  const reasonRef = useRef<HTMLTextAreaElement>(null)
  const describe = useActionError()
  const save = useSaveAttendance(code, sessionId)
  // solo lo que la persona cambió: lo demás es lo que dice el servidor. un fallo no lo toca: lo marcado sigue ahí para reintentar
  const [overrides, setOverrides] = useState<AttendanceOverrides>({})
  const [reason, setReason] = useState('')
  const [reasonInvalid, setReasonInvalid] = useState(false)
  const changed = rows.flatMap((row) => {
    const status = overrides[row.enrollmentId]
    return status && status !== row.status ? [{ row, status }] : []
  })
  const { counts, unmarked, unsaved } = attendanceSummary(rows, overrides)
  const dirty = unsaved > 0
  useEffect(() => {
    onDirty(dirty)
    return () => onDirty(false)
  }, [dirty, onDirty])
  // cambiar una ya registrada exige motivo (409 sin él); registrar la primera vez, no
  const needsReason = changed.some(({ row }) => row.status !== null)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const invalid = needsReason && reasonProblem(reason) !== null
    setReasonInvalid(invalid)
    if (invalid) {
      // tras pintar el error: al enfocar se desplaza contando con él, y no queda bajo el total fijo
      requestAnimationFrame(() => reasonRef.current?.focus())
      return
    }
    save.mutate(
      { records: changed.map(({ row, status }) => ({ enrollmentId: row.enrollmentId, status })), reason: needsReason ? normalizeReason(reason) : null },
      {
        onSuccess: () => {
          setOverrides({})
          setReason('')
        }
      }
    )
  }
  // pulsar lo marcado sin guardar lo deshace; lo registrado solo cambia eligiendo otro estado
  const choose = (row: AttendanceRow, status: AttendanceStatus) =>
    setOverrides(({ [row.enrollmentId]: previous, ...rest }) => (previous === status || row.status === status ? rest : { ...rest, [row.enrollmentId]: status }))
  // por lo que se ve: el nombre si el servidor lo da, si no el correo; sin ninguno, al final
  const sorted = [...rows].sort((a, b) => {
    const [first, second] = [submitterOf(a), submitterOf(b)]
    return first === null ? 1 : second === null ? -1 : first.localeCompare(second)
  })
  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      {/* el título es para lectores de pantalla: a la vista, las cifras no abren una sección «§» vacía */}
      <section aria-labelledby={`${id}-summary`}>
        <h2 id={`${id}-summary`} className="sr-only">
          {t('attendance.summary')}
        </h2>
        <StatList>
          {ATTENDANCE_STATUSES.map((status) => (
            <Stat key={status} label={t(`attendance.statuses.${status}`)} value={formatNumber(counts[status], locale)} icon={LOOK[status].icon} />
          ))}
          <Stat label={t('attendance.unmarked')} value={formatNumber(unmarked, locale)} />
        </StatList>
      </section>
      <div className="flex flex-col items-start gap-1">
        <Button
          type="button"
          variant="secondary"
          className={`${WRAP} min-h-11`}
          disabled={unmarked === 0}
          onClick={() => setOverrides(markAllPresent(rows, overrides))}
        >
          {t('attendance.markAll')}
        </Button>
        <p className="text-secondary text-ink-muted">{t('attendance.markAllHint')}</p>
      </div>
      <ul aria-label={t('attendance.title')} className="flex flex-col divide-y divide-border border-y border-border [&_button]:scroll-mb-32">
        {sorted.map((row) => {
          const student = submitterOf(row) ?? t('roster.noEmail')
          const override = overrides[row.enrollmentId]
          const current = override ?? row.status
          return (
            <li key={row.enrollmentId} className="@container py-3">
              <div className="flex flex-col gap-2 @2xl:flex-row @2xl:items-center @2xl:justify-between @2xl:gap-6">
                <div className="flex min-w-0 flex-col gap-0.5 text-secondary">
                  <span className="font-medium text-ink">
                    <Submitter attempt={row} />
                  </span>
                  {!current ? <span className="text-ink-muted">{t('attendance.unmarked')}</span> : null}
                  {override && override !== row.status ? <span className="text-ink-muted">{t('attendance.rowUnsaved')}</span> : null}
                </div>
                <div role="group" aria-label={t('attendance.rowLabel', { student })} className="grid shrink-0 grid-cols-4 gap-1 @2xl:w-[29rem]">
                  {ATTENDANCE_STATUSES.map((status) => {
                    const { icon: Icon, pressed } = LOOK[status]
                    const active = current === status
                    return (
                      <button
                        key={status}
                        type="button"
                        aria-pressed={active}
                        onClick={() => choose(row, status)}
                        className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1 text-secondary transition-colors duration-[160ms] motion-reduce:transition-none @2xl:flex-row @2xl:gap-1.5 @2xl:px-3 @2xl:text-sm ${
                          active ? `border-2 font-medium ${pressed}` : 'border-border-control bg-surface text-ink hover:bg-surface-muted'
                        }`}
                      >
                        <Icon aria-hidden="true" className="size-4 shrink-0" />
                        {t(`attendance.statuses.${status}`)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {needsReason ? (
        <div className="flex max-w-xl flex-col gap-1.5">
          <Label htmlFor={`${id}-reason`}>{t('attendance.reason')}</Label>
          <Textarea
            ref={reasonRef}
            id={`${id}-reason`}
            rows={2}
            value={reason}
            aria-invalid={reasonInvalid ? true : undefined}
            aria-describedby={`${id}-reason-hint`}
            onChange={(event) => setReason(event.target.value)}
            className="scroll-mb-40"
          />
          <p id={`${id}-reason-hint`} className="text-secondary text-ink-muted">
            {t('attendance.reasonHint')}
          </p>
          {reasonInvalid ? (
            <p role="alert" className="text-secondary text-danger">
              {t('reason.invalid', { max: CHANGE_REASON_MAX_LENGTH })}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className={STICKY_BAR}>
        {save.error ? (
          <Notice tone="danger" title={t('attendance.saveFailed')}>
            {describe(save.error)}
          </Notice>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p role="status" className="text-secondary font-semibold text-ink">
            {dirty
              ? t('attendance.unsaved', { count: unsaved, value: formatNumber(unsaved, locale) })
              : save.isSuccess
                ? t('attendance.saved')
                : t('attendance.allSaved')}
          </p>
          <Button className={`${WRAP} min-h-11 shrink-0 px-5`} type="submit" disabled={save.isPending || changed.length === 0}>
            {save.isPending ? t('attendance.saving') : t('attendance.save')}
          </Button>
        </div>
      </div>
    </form>
  )
}
