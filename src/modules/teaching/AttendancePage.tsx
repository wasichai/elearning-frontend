import { CHANGE_REASON_MAX_LENGTH, LoadingState, normalizeReason, reasonProblem, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button, Label, Table, Td, Textarea, Th } from '@wasichai/ui'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { WRAP } from '../../shared/buttons'
import { useParams } from 'react-router'
import { formatInstantRange, timeZoneLabel } from '../../shared/format'
import { ATTENDANCE_STATUSES, type AttendanceStatus } from '../../shared/sessions'
import { useAttendance, useOfferingSessions, useSaveAttendance } from './api'
import type { AttendanceRow } from './contract'
import { OfferingFrame, QueryProblem, useActionError } from './parts'
import { TEACHING_ROUTES } from './routes'

// pasar asistencia de una sesión. no toca el progreso de materiales (ADR-0016)
export function AttendancePage() {
  const { t, i18n } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const { code = '', sessionId = '' } = useParams()
  const session = useOfferingSessions(code).data?.find((candidate) => candidate.id === sessionId)
  const query = useAttendance(sessionId)
  return (
    <OfferingFrame
      code={code}
      subtitle={session?.title ?? t('attendance.title')}
      back={links.to(TEACHING_ROUTES.sessions, { code })}
      backLabel={t('attendance.back')}
    >
      {session ? (
        <p className="text-sm text-ink-muted">
          {formatInstantRange(session.start, session.end, i18n.language, session.timeZone)} ({timeZoneLabel(session.timeZone, i18n.language)})
        </p>
      ) : null}
      {session?.status === 'CANCELADA' ? <Alert tone="notice">{t('attendance.cancelled')}</Alert> : null}
      {query.isError ? (
        <QueryProblem error={query.error} resource="attendance" onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <LoadingState label={t('attendance.loading')} />
      ) : query.data.length === 0 ? (
        <p className="py-6 text-sm text-ink-muted">{t('attendance.empty')}</p>
      ) : (
        <AttendanceForm code={code} sessionId={sessionId} rows={query.data} />
      )}
    </OfferingFrame>
  )
}

function AttendanceForm({ code, sessionId, rows }: { code: string; sessionId: string; rows: AttendanceRow[] }) {
  const { t } = useTranslation('teaching')
  const id = useId()
  const describe = useActionError()
  const save = useSaveAttendance(code, sessionId)
  // solo lo que la persona cambió: lo demás es lo que dice el servidor
  const [overrides, setOverrides] = useState<Partial<Record<string, AttendanceStatus>>>({})
  const [reason, setReason] = useState('')
  const [reasonInvalid, setReasonInvalid] = useState(false)
  const changed = rows.flatMap((row) => {
    const status = overrides[row.enrollmentId]
    return status && status !== row.status ? [{ row, status }] : []
  })
  // cambiar una ya registrada exige motivo (409 sin él); registrar la primera vez, no
  const needsReason = changed.some(({ row }) => row.status !== null)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const invalid = needsReason && reasonProblem(reason) !== null
    setReasonInvalid(invalid)
    if (invalid) return
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
  const sorted = [...rows].sort((a, b) => (a.email === null ? 1 : b.email === null ? -1 : a.email.localeCompare(b.email)))
  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <Table aria-label={t('attendance.title')}>
          <thead>
            <tr>
              <Th scope="col">{t('attendance.student')}</Th>
              <Th scope="col">{t('attendance.status')}</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const student = row.email ?? t('roster.noEmail')
              const current = overrides[row.enrollmentId] ?? row.status
              return (
                <tr key={row.enrollmentId}>
                  <Th scope="row" className="font-normal break-all">
                    {student}
                  </Th>
                  <Td>
                    <div role="radiogroup" aria-label={t('attendance.rowLabel', { student })} className="flex flex-wrap gap-x-4 gap-y-1">
                      {ATTENDANCE_STATUSES.map((status) => (
                        <label key={status} className="flex items-center gap-1.5 text-sm text-ink">
                          <input
                            type="radio"
                            name={`${id}-${row.enrollmentId}`}
                            checked={current === status}
                            onChange={() => setOverrides((all) => ({ ...all, [row.enrollmentId]: status }))}
                            className="size-4 accent-brand"
                          />
                          {t(`attendance.statuses.${status}`)}
                        </label>
                      ))}
                    </div>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </div>
      {needsReason ? (
        <div className="flex max-w-xl flex-col gap-1.5">
          <Label htmlFor={`${id}-reason`}>{t('attendance.reason')}</Label>
          <Textarea
            id={`${id}-reason`}
            rows={2}
            value={reason}
            aria-invalid={reasonInvalid ? true : undefined}
            aria-describedby={`${id}-reason-hint`}
            onChange={(event) => setReason(event.target.value)}
          />
          <p id={`${id}-reason-hint`} className="text-xs text-ink-muted">
            {t('attendance.reasonHint')}
          </p>
          {reasonInvalid ? (
            <p role="alert" className="text-sm text-danger">
              {t('reason.invalid', { max: CHANGE_REASON_MAX_LENGTH })}
            </p>
          ) : null}
        </div>
      ) : null}
      {save.error ? <Alert tone="danger">{describe(save.error)}</Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button className={WRAP} type="submit" disabled={save.isPending || changed.length === 0}>
          {save.isPending ? t('attendance.saving') : t('attendance.save')}
        </Button>
        <p role="status" className="text-sm text-success">
          {save.isSuccess && changed.length === 0 ? t('attendance.saved') : ''}
        </p>
      </div>
    </form>
  )
}
