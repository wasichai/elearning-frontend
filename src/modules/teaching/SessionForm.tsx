import { Alert, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { WRAP } from '../../shared/buttons'
import { formatDateTime, timeZoneLabel } from '../../shared/format'
import { isHttpsUrl, SESSION_MODALITIES, SESSION_TYPES, type Session, type SessionType } from '../../shared/sessions'
import { useCreateSessions, type NewSessions } from './api'
import { RECURRENCE_PATTERNS, WEEK_DAYS, type RecurrencePattern, type WeekDay } from './contract'
import { useActionError } from './parts'

type Field = 'title' | 'duration' | 'link' | 'location' | 'original' | 'startDate' | 'endDate' | 'localTime' | 'days'

// crear una sesión o una serie. la hora es local en la zona de la edición y cada ocurrencia la conserva (ADR-0016)
export function SessionForm({ code, timeZone, sessions, onDone }: { code: string; timeZone: string; sessions: Session[]; onDone: (count: number) => void }) {
  const { t, i18n } = useTranslation('teaching')
  const id = useId()
  const describe = useActionError()
  const create = useCreateSessions(code)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<SessionType>('TEORIA')
  const [modality, setModality] = useState<Session['modality']>('VIRTUAL')
  const [duration, setDuration] = useState('60')
  const [link, setLink] = useState('')
  const [location, setLocation] = useState('')
  const [original, setOriginal] = useState('')
  const [pattern, setPattern] = useState<RecurrencePattern>('ONCE')
  const [days, setDays] = useState<WeekDay[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [localTime, setLocalTime] = useState('')
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const virtual = modality === 'VIRTUAL'
  const recovery = type === 'RECUPERACION'
  const once = pattern === 'ONCE'
  const validate = () => {
    const found: Partial<Record<Field, string>> = {}
    if (!title.trim()) found.title = t('form.required')
    const minutes = Number(duration)
    if (!Number.isInteger(minutes) || minutes <= 0) found.duration = t('form.durationInvalid')
    if (virtual && link.trim() && !isHttpsUrl(link.trim())) found.link = t('form.linkInvalid')
    if (!virtual && !location.trim()) found.location = t('form.required')
    if (recovery && !original) found.original = t('form.required')
    if (!startDate) found.startDate = t('form.required')
    if (!once && !endDate) found.endDate = t('form.required')
    if (!once && endDate && startDate && endDate < startDate) found.endDate = t('form.endBeforeStart')
    if (!localTime) found.localTime = t('form.required')
    if (pattern === 'WEEKDAYS' && days.length === 0) found.days = t('form.daysRequired')
    return found
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return
    const body: NewSessions = {
      title: title.trim(),
      type,
      modality,
      durationMinutes: Number(duration),
      link: virtual && link.trim() ? link.trim() : null,
      location: !virtual ? location.trim() : null,
      lessonId: null,
      ...(recovery ? { originalSessionId: original } : {}),
      recurrence: { pattern, days: pattern === 'WEEKDAYS' ? days : [], startDate, endDate: once ? startDate : endDate, localTime }
    }
    create.mutate(body, { onSuccess: (created) => onDone(created.length) })
  }
  const locale = i18n.language
  return (
    <form noValidate aria-label={t('form.title')} onSubmit={submit} className="flex flex-col gap-4 rounded-card border border-border px-5 py-4">
      <h2 className="text-lg font-semibold text-ink">{t('form.title')}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={`${id}-title`} label={t('form.name')} error={errors.title}>
          {(props) => <Input {...props} value={title} onChange={(event) => setTitle(event.target.value)} />}
        </FormField>
        <FormField id={`${id}-duration`} label={t('form.duration')} error={errors.duration}>
          {(props) => <Input {...props} type="number" min={1} value={duration} onChange={(event) => setDuration(event.target.value)} />}
        </FormField>
        <ChoiceField id={`${id}-type`} label={t('form.type')} value={type} onChange={(value) => setType(value as SessionType)}>
          {SESSION_TYPES.map((value) => (
            <SelectItem key={value} value={value}>
              {t(`sessions.type.${value}`)}
            </SelectItem>
          ))}
        </ChoiceField>
        <ChoiceField id={`${id}-modality`} label={t('form.modality')} value={modality} onChange={(value) => setModality(value as Session['modality'])}>
          {SESSION_MODALITIES.map((value) => (
            <SelectItem key={value} value={value}>
              {t(`sessions.modality.${value}`)}
            </SelectItem>
          ))}
        </ChoiceField>
        {virtual ? (
          <FormField id={`${id}-link`} label={t('form.link')} error={errors.link}>
            {(props) => <Input {...props} type="url" placeholder={t('form.linkPlaceholder')} value={link} onChange={(event) => setLink(event.target.value)} />}
          </FormField>
        ) : (
          <FormField id={`${id}-location`} label={t('form.location')} error={errors.location}>
            {(props) => <Input {...props} value={location} onChange={(event) => setLocation(event.target.value)} />}
          </FormField>
        )}
        {recovery ? (
          sessions.length > 0 ? (
            <ChoiceField id={`${id}-original`} label={t('form.original')} value={original} error={errors.original} onChange={setOriginal}>
              {sessions.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {t('form.originalOption', { title: session.title, when: formatDateTime(session.start, locale, session.timeZone) })}
                </SelectItem>
              ))}
            </ChoiceField>
          ) : (
            <Alert tone="warning">{t('form.noOriginal')}</Alert>
          )
        ) : null}
      </div>
      <fieldset className="flex flex-col gap-4 border-t border-border pt-4">
        <legend className="text-sm font-medium text-ink">{t('form.schedule')}</legend>
        <p className="text-xs text-ink-muted">{t('form.zoneHint', { zone: timeZoneLabel(timeZone, locale) })}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <ChoiceField id={`${id}-pattern`} label={t('form.pattern')} value={pattern} onChange={(value) => setPattern(value as RecurrencePattern)}>
            {RECURRENCE_PATTERNS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`form.patterns.${value}`)}
              </SelectItem>
            ))}
          </ChoiceField>
          <FormField id={`${id}-time`} label={t('form.localTime')} error={errors.localTime}>
            {(props) => <Input {...props} type="time" value={localTime} onChange={(event) => setLocalTime(event.target.value)} />}
          </FormField>
          <FormField id={`${id}-start`} label={once ? t('form.date') : t('form.startDate')} error={errors.startDate}>
            {(props) => <Input {...props} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />}
          </FormField>
          {once ? null : (
            <FormField id={`${id}-end`} label={t('form.endDate')} error={errors.endDate}>
              {(props) => <Input {...props} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />}
            </FormField>
          )}
        </div>
        {pattern === 'WEEKDAYS' ? (
          <div role="group" aria-label={t('form.days')} className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink">{t('form.days')}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {WEEK_DAYS.map((day) => (
                <label key={day} className="flex items-center gap-1.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={days.includes(day)}
                    onChange={(event) => setDays((all) => (event.target.checked ? [...all, day] : all.filter((other) => other !== day)))}
                    className="size-4 accent-brand"
                  />
                  {t(`form.weekDays.${day}`)}
                </label>
              ))}
            </div>
            {errors.days ? (
              <p role="alert" className="text-sm text-danger">
                {errors.days}
              </p>
            ) : null}
          </div>
        ) : null}
      </fieldset>
      {create.error ? <Alert tone="danger">{describe(create.error)}</Alert> : null}
      <div className="flex flex-wrap gap-3">
        <Button className={WRAP} type="submit" disabled={create.isPending}>
          {create.isPending ? t('form.creating') : once ? t('form.createOne') : t('form.createSeries')}
        </Button>
      </div>
    </form>
  )
}

interface ControlProps {
  id: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

function FormField({ id, label, error, children }: { id: string; label: string; error?: string; children: (props: ControlProps) => ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-error` : undefined })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function ChoiceField({
  id,
  label,
  value,
  error,
  onChange,
  children
}: {
  id: string
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
