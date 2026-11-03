import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, LoadingState, useApiClient, useAuth } from '@wasichai/core'
import { Button, ConfirmDialog, Input, Label, Textarea } from '@wasichai/ui'
import { CircleAlert } from 'lucide-react'
import { useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { WRAP } from '../../shared/buttons'
import { parseContract } from '../../shared/contract'
import { formatInstant, formatNumber } from '../../shared/format'
import { Notice } from '../../shared/Notice'
import { ProblemState } from '../../shared/ProblemState'
import { ReturnFocus } from '../../shared/ReturnFocus'
import { ScreenBody, ScreenHeader } from '../../shared/Screen'
import { TERMS_KEY, TERMS_PATH, termsVersionSchema, useTermsView, type TermsVersion, type TermsView } from '../../shared/terms'
import { useLeaveGuard } from '../../shared/useLeaveGuard'
import { canAdminister } from '../../shellNav'

const MAX_TEXT = 100_000
const MAX_DAYS = 36_500

interface PublishRequest {
  text: string
  retentionDays: number
}

function usePublishTerms() {
  const client = useApiClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: PublishRequest): Promise<TermsVersion> =>
      parseContract(termsVersionSchema, 'POST terms', await client.request<unknown>(TERMS_PATH, { method: 'POST', body: JSON.stringify(request) })),
    onSuccess: (current) => {
      queryClient.setQueryData<TermsView>(TERMS_KEY, (view) => ({ acceptance: view?.acceptance ?? null, current }))
      void queryClient.invalidateQueries({ queryKey: TERMS_KEY })
    }
  })
}

// publicar otra versión de los términos: lo decide el servidor (MANAGE_ORGANIZATION), y aquí es cortesía. sin permiso no se pinta nada del formulario
export function PublishTermsPage() {
  const { t } = useTranslation('administration')
  const { permissions, permissionsError } = useAuth()
  const allowed = canAdminister(permissions)
  return (
    <>
      <ScreenHeader width="reading" title={t('publish.title')} subtitle={allowed ? t('publish.subtitle') : undefined} />
      <ScreenBody width="reading">
        {allowed ? (
          <Publish />
        ) : permissions || permissionsError ? (
          <ProblemState title={t('publish.refused')} description={t('publish.refusedHint')} />
        ) : (
          <LoadingState label={t('publish.loading')} />
        )}
      </ScreenBody>
    </>
  )
}

function Publish() {
  const { t, i18n } = useTranslation('administration')
  const view = useTermsView()
  const [published, setPublished] = useState<number | null>(null)
  const notice = useRef<HTMLDivElement>(null)
  if (view.isPending) return <LoadingState label={t('publish.loading')} />
  if (!view.data)
    return (
      <ProblemState title={t('publish.loadFailed')} description={t('publish.loadFailedHint')}>
        <Button variant="secondary" onClick={() => void view.refetch()}>
          {t('publish.retry')}
        </Button>
      </ProblemState>
    )
  const { current } = view.data
  return (
    <>
      <div ref={notice} tabIndex={-1} className="flex flex-col gap-3 rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-focus">
        {published !== null ? (
          <Notice tone="success" title={t('publish.published', { version: published })}>
            {t('publish.publishedBody')}
          </Notice>
        ) : null}
        {current ? (
          <p className="text-sm text-ink-muted">
            {t('publish.current', {
              version: current.version,
              days: t('publish.days', { count: current.retentionDays, formatted: formatNumber(current.retentionDays, i18n.language) }),
              date: formatInstant(current.publishedAt, i18n.language)
            })}
          </p>
        ) : (
          <Notice tone="warning">{t('publish.none')}</Notice>
        )}
      </div>
      {/* una versión nueva vacía el estado del formulario: parte de lo que acaba de quedar vigente */}
      <PublishForm
        key={current?.version ?? 'none'}
        current={current}
        onDirty={() => setPublished(null)}
        onPublished={(version) => {
          setPublished(version)
          setTimeout(() => notice.current?.focus())
        }}
      />
    </>
  )
}

type FieldErrors = { text?: string | undefined; retentionDays?: string | undefined }

const WHOLE_NUMBER = /^\d+$/

function PublishForm({ current, onDirty, onPublished }: { current: TermsVersion | null; onDirty: () => void; onPublished: (version: number) => void }) {
  const { t } = useTranslation('administration')
  const id = useId()
  const publish = usePublishTerms()
  const textField = useRef<HTMLTextAreaElement>(null)
  const daysField = useRef<HTMLInputElement>(null)
  const initialText = current?.text ?? ''
  const initialDays = current ? String(current.retentionDays) : ''
  const [text, setText] = useState(initialText)
  const [days, setDays] = useState(initialDays)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [confirming, setConfirming] = useState(false)
  const leave = useLeaveGuard((text !== initialText || days !== initialDays) && !publish.isSuccess)

  const focusFirst = (found: FieldErrors) => setTimeout(() => (found.text ? textField : daysField).current?.focus())

  const validate = (): FieldErrors => {
    const trimmed = text.trim()
    const parsed = Number(days)
    return {
      text: trimmed === '' ? t('publish.textError') : trimmed.length > MAX_TEXT ? t('publish.textServerError') : undefined,
      retentionDays: WHOLE_NUMBER.test(days.trim()) && parsed >= 1 && parsed <= MAX_DAYS ? undefined : t('publish.retentionError')
    }
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (found.text || found.retentionDays) focusFirst(found)
    else setConfirming(true)
  }

  // el 400 del servidor, por campo. su mensaje es técnico y en inglés: se dice en el idioma de la interfaz, en el campo que nombra
  const onConfirm = () =>
    publish.mutate(
      { text: text.trim(), retentionDays: Number(days) },
      {
        onSuccess: (version) => {
          setConfirming(false)
          onPublished(version.version)
        },
        onError: (error) => {
          if (!(error instanceof ApiError) || error.status !== 400) return
          const fields = new Set(error.violations.map((violation) => violation.field))
          if (!fields.has('text') && !fields.has('retentionDays')) return
          const found = {
            text: fields.has('text') ? t('publish.textServerError') : undefined,
            retentionDays: fields.has('retentionDays') ? t('publish.retentionError') : undefined
          }
          setErrors(found)
          setConfirming(false)
          publish.reset()
          focusFirst(found)
        }
      }
    )

  const dialogError = !publish.error
    ? undefined
    : publish.error instanceof ApiError && publish.error.status === 403
      ? t('publish.refused')
      : publish.error instanceof ApiError && publish.error.status === 400
        ? t('publish.invalid', { detail: publish.error.message })
        : t('publish.failed')

  return (
    <form aria-label={t('publish.formLabel')} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-text`}>{t('publish.text')}</Label>
        <Textarea
          ref={textField}
          id={`${id}-text`}
          rows={14}
          value={text}
          aria-invalid={errors.text ? true : undefined}
          aria-describedby={`${id}-text-help`}
          onChange={(event) => {
            setText(event.target.value)
            setErrors({ ...errors, text: undefined })
            onDirty()
          }}
        />
        <FieldHelp id={`${id}-text-help`} error={errors.text} hint={t('publish.textHint')} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-days`}>{t('publish.retention')}</Label>
        <Input
          ref={daysField}
          id={`${id}-days`}
          inputMode="numeric"
          autoComplete="off"
          className="w-40"
          value={days}
          aria-invalid={errors.retentionDays ? true : undefined}
          aria-describedby={`${id}-days-help`}
          onChange={(event) => {
            setDays(event.target.value)
            setErrors({ ...errors, retentionDays: undefined })
            onDirty()
          }}
        />
        <FieldHelp id={`${id}-days-help`} error={errors.retentionDays} hint={t('publish.retentionHint')} />
      </div>
      <div>
        <Button type="submit" className={WRAP}>
          {t('publish.submit')}
        </Button>
      </div>
      {confirming ? (
        <ReturnFocus>
          <ConfirmDialog
            variant="primary"
            title={t('publish.confirmTitle')}
            description={t('publish.confirmDescription')}
            confirmLabel={publish.isPending ? t('publish.publishing') : t('publish.confirm')}
            cancelLabel={t('publish.cancel')}
            busy={publish.isPending}
            error={dialogError}
            onCancel={() => {
              publish.reset()
              setConfirming(false)
            }}
            onConfirm={onConfirm}
          />
        </ReturnFocus>
      ) : null}
      {leave.leaving ? (
        <ReturnFocus>
          <ConfirmDialog
            title={t('publish.leaveTitle')}
            description={t('publish.leaveDescription')}
            confirmLabel={t('publish.leave')}
            cancelLabel={t('publish.stay')}
            onCancel={leave.stay}
            onConfirm={leave.leave}
          />
        </ReturnFocus>
      ) : null}
    </form>
  )
}

function FieldHelp({ id, error, hint }: { id: string; error: string | undefined; hint: string }) {
  if (!error)
    return (
      <p id={id} className="text-sm text-ink-muted">
        {hint}
      </p>
    )
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-sm text-danger">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{error}</span>
    </p>
  )
}
