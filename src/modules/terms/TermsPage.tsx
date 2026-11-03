import { ApiError, EmptyState, LoadingState, useAuth, useWasichaiLinks } from '@wasichai/core'
import { Button, ConfirmDialog } from '@wasichai/ui'
import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { WRAP } from '../../shared/buttons'
import { ContractError } from '../../shared/contract'
import { formatInstant, formatNumber } from '../../shared/format'
import { Notice } from '../../shared/Notice'
import { ProblemState } from '../../shared/ProblemState'
import { ReturnFocus } from '../../shared/ReturnFocus'
import { ScreenBody, ScreenHeader, Section, Stat, StatList, screenContainer } from '../../shared/Screen'
import { RETURN_TO_PARAM, acceptanceState, safeReturnTo, useTermsView, type TermsAcceptance, type TermsVersion, type TermsView } from '../../shared/terms'
import { canAdminister } from '../../shellNav'
import { useAcceptTerms, useWithdrawTerms, type Withdrawal } from './api'
import { PUBLISH_TERMS_ROUTE, TERMS_ROUTES } from './routes'

// los términos de uso de la persona (ADR-0037 del backend): los lee, los acepta y vuelve a lo que hacía, o los retira. publicarlos no es de aquí
export function TermsPage() {
  const { t } = useTranslation('terms')
  const view = useTermsView()
  return (
    // a toda la altura: con un texto corto, la barra de la acción se queda abajo y no flota a media pantalla
    <div className="flex min-h-full flex-col">
      <ScreenHeader width="reading" title={t('title')} />
      {view.isPending ? (
        <ScreenBody width="reading">
          <LoadingState label={t('loading')} />
        </ScreenBody>
      ) : view.isError && !view.data ? (
        <ScreenBody width="reading">
          <ProblemState title={view.error instanceof ContractError ? t('load.contract') : t('load.failed')} description={t('load.failedHint')}>
            <Button variant="secondary" onClick={() => void view.refetch()}>
              {t('load.retry')}
            </Button>
          </ProblemState>
        </ScreenBody>
      ) : view.data?.current ? (
        <CurrentTerms view={view.data} current={view.data.current} refresh={async () => (await view.refetch()).data} />
      ) : (
        <NoTerms />
      )}
    </div>
  )
}

// a dónde volver después de aceptar: el login y esta misma pantalla, no
function useReturnTo(): string | null {
  const links = useWasichaiLinks()
  const [search] = useSearchParams()
  return safeReturnTo(search.get(RETURN_TO_PARAM), [links.login(), links.to(TERMS_ROUTES.terms)])
}

function NoTerms() {
  const { t } = useTranslation('terms')
  const { permissions } = useAuth()
  const links = useWasichaiLinks()
  const returnTo = useReturnTo()
  const administers = canAdminister(permissions)
  return (
    <ScreenBody width="reading">
      <EmptyState title={t('none.title')}>
        <p className="max-w-prose">{administers ? t('none.admin') : t('none.person')}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          {administers && links.has(PUBLISH_TERMS_ROUTE) ? (
            <Button asChild className={WRAP}>
              <Link to={links.to(PUBLISH_TERMS_ROUTE)}>{t('none.publish')}</Link>
            </Button>
          ) : null}
          {returnTo ? (
            <Button asChild variant="secondary" className={WRAP}>
              <Link to={returnTo}>{t('back.done')}</Link>
            </Button>
          ) : null}
        </div>
      </EmptyState>
    </ScreenBody>
  )
}

type AcceptProblem = 'erasing' | 'changed' | 'conflict' | 'failed'
type WithdrawOutcome = { kind: 'withdrawing'; withdrawal: Withdrawal } | { kind: 'missing' }

// un 409 al aceptar tiene varias causas (docs/api/lms.md) y core no entrega la cabecera Retry-After: la causa la dice volver a leer los términos
function acceptProblem(error: unknown, version: number, fresh: TermsView | undefined): AcceptProblem {
  if (!(error instanceof ApiError) || error.status !== 409) return 'failed'
  if (fresh?.current && fresh.current.version !== version) return 'changed'
  if (fresh?.acceptance && !fresh.acceptance.valid) return 'erasing'
  return 'conflict'
}

interface CurrentTermsProps {
  view: TermsView
  current: TermsVersion
  // vuelve a leer los términos del servidor
  refresh(): Promise<TermsView | undefined>
}

function CurrentTerms({ view, current, refresh }: CurrentTermsProps) {
  const { t, i18n } = useTranslation('terms')
  const navigate = useNavigate()
  const returnTo = useReturnTo()
  const state = acceptanceState(view)
  const accept = useAcceptTerms()
  const [problem, setProblem] = useState<AcceptProblem | null>(null)
  const [outcome, setOutcome] = useState<WithdrawOutcome | null>(null)
  // tras aceptar o retirar, el botón pulsado desaparece: el foco pasa al aviso que dice lo que ha pasado
  const status = useRef<HTMLDivElement>(null)
  const focusStatus = () => setTimeout(() => status.current?.focus())

  const onAccept = () => {
    setProblem(null)
    setOutcome(null)
    accept.mutate(current.version, {
      onSuccess: () => {
        if (returnTo) void navigate(returnTo, { replace: true })
        else focusStatus()
      },
      onError: async (error) => setProblem(acceptProblem(error, current.version, await refresh()))
    })
  }

  const needsAccepting = state !== 'current'
  const canGoBack = returnTo !== null
  const erasing = state === 'withdrawn' || state === 'expired'
  const acceptLabel = erasing ? t('accept.again') : state === 'older' ? t('accept.actionVersion', { version: current.version }) : t('accept.action')

  return (
    <>
      <ScreenBody width="reading" className="flex-1 pb-8!">
        <div
          ref={status}
          tabIndex={-1}
          role="group"
          aria-label={t('status.label')}
          className="rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-focus"
        >
          <StatusNotice view={view} current={current} outcome={outcome} returning={canGoBack} />
        </div>
        <StatList>
          <Stat
            label={t('facts.version')}
            value={formatNumber(current.version, i18n.language)}
            hint={t('facts.published', { date: formatInstant(current.publishedAt, i18n.language) })}
          />
          <Stat
            label={t('facts.retention')}
            value={t('facts.days', { count: current.retentionDays, formatted: formatNumber(current.retentionDays, i18n.language) })}
            hint={t('facts.retentionHint')}
          />
        </StatList>
        <Section title={t('text.title')}>
          {/* dato: React lo escapa y nunca se interpreta como HTML. conserva los párrafos de quien lo escribió */}
          <div className="font-read text-read-body whitespace-pre-wrap text-ink [overflow-wrap:anywhere]">{current.text}</div>
        </Section>
        {view.acceptance?.valid ? (
          <Withdraw
            onDone={(next) => {
              setOutcome(next)
              focusStatus()
            }}
          />
        ) : null}
      </ScreenBody>
      {needsAccepting || canGoBack ? (
        // el texto puede ser largo: la acción se queda a la vista, como la de la lección
        <section aria-label={t('status.actions')} className="sticky bottom-0 z-10 border-t border-border bg-surface">
          <div className={`${screenContainer('reading')} flex flex-col gap-2 py-2.5`}>
            {problem ? <AcceptNotice problem={problem} /> : null}
            <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
              {needsAccepting ? (
                <Button variant={erasing ? 'secondary' : 'primary'} onClick={onAccept} disabled={accept.isPending} className={WRAP}>
                  {accept.isPending ? t('accept.accepting') : acceptLabel}
                </Button>
              ) : null}
              {returnTo ? (
                <Button asChild variant={needsAccepting ? 'secondary' : 'primary'} className={WRAP}>
                  <Link to={returnTo}>{state === 'none' ? t('back.withoutAccepting') : t('back.done')}</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </>
  )
}

interface StatusNoticeProps {
  view: TermsView
  current: TermsVersion
  outcome: WithdrawOutcome | null
  // llegó con una vuelta pendiente: la está esperando lo que hacía
  returning: boolean
}

function StatusNotice({ view, current, outcome, returning }: StatusNoticeProps) {
  const { t, i18n } = useTranslation('terms')
  const date = (instant: string) => formatInstant(instant, i18n.language)
  const accepted = (acceptance: TermsAcceptance) => ({
    version: acceptance.version,
    accepted: date(acceptance.acceptedAt),
    expires: date(acceptance.expiresAt)
  })
  if (outcome?.kind === 'withdrawing')
    return (
      <Notice tone="warning" title={t('status.withdrawing.title')}>
        <span className="block">{t('status.withdrawing.body')}</span>
        <span className="block [overflow-wrap:anywhere]">{t('status.withdrawing.reference', { jobId: outcome.withdrawal.jobId })}</span>
      </Notice>
    )
  const { acceptance } = view
  const missing = outcome?.kind === 'missing' ? <span className="block">{t('withdraw.missing')}</span> : null
  switch (acceptanceState(view)) {
    case 'current':
      return (
        <Notice tone="success" title={t('status.current.title')}>
          {t('status.current.body', accepted(acceptance!))}
          {missing}
        </Notice>
      )
    case 'older':
      return (
        <Notice tone="notice" title={t('status.older.title')}>
          <span className="block">{t('status.older.body', accepted(acceptance!))}</span>
          <span className="block">{t('status.older.renew', { next: current.version })}</span>
          {missing}
        </Notice>
      )
    case 'withdrawn':
      return (
        <Notice tone="warning" title={t('status.withdrawn.title')}>
          {t('status.withdrawn.body', { date: date(acceptance!.withdrawnAt!) })}
          {missing}
        </Notice>
      )
    case 'expired':
      return (
        <Notice tone="warning" title={t('status.expired.title')}>
          {t('status.expired.body', { date: date(acceptance!.expiresAt) })}
          {missing}
        </Notice>
      )
    default:
      return (
        <Notice tone="notice" title={t('status.none.title')}>
          <span className="block">{returning ? t('status.none.returning') : t('status.none.body')}</span>
          {missing}
        </Notice>
      )
  }
}

function AcceptNotice({ problem }: { problem: AcceptProblem }) {
  const { t } = useTranslation('terms')
  const tones = { erasing: 'warning', changed: 'warning', conflict: 'danger', failed: 'danger' } as const
  return <Notice tone={tones[problem]}>{t(`accept.${problem}`)}</Notice>
}

// retirar es destructivo: una secundaria al final de la pantalla, que dice antes de pulsar qué se suprime según el contrato (seguridad §7 del
// backend), y un diálogo que lo confirma. el 202 solo dice que la supresión quedó en la cola
function Withdraw({ onDone }: { onDone: (outcome: WithdrawOutcome) => void }) {
  const { t } = useTranslation('terms')
  const withdraw = useWithdrawTerms()
  const [confirming, setConfirming] = useState(false)
  const close = () => {
    withdraw.reset()
    setConfirming(false)
  }
  const onConfirm = () =>
    withdraw.mutate(undefined, {
      onSuccess: (withdrawal) => {
        setConfirming(false)
        onDone({ kind: 'withdrawing', withdrawal })
      },
      onError: (error) => {
        if (!(error instanceof ApiError) || error.status !== 404) return
        setConfirming(false)
        onDone({ kind: 'missing' })
      }
    })
  return (
    <Section title={t('withdraw.title')} description={t('withdraw.intro')} className="border-t border-border pt-6">
      <dl className="flex flex-col gap-3 text-sm">
        <Fact label={t('withdraw.erasedLabel')}>{t('withdraw.erased')}</Fact>
        <Fact label={t('withdraw.anonymizedLabel')}>{t('withdraw.anonymized')}</Fact>
        <Fact label={t('withdraw.keptLabel')}>{t('withdraw.kept')}</Fact>
      </dl>
      <div>
        <Button variant="secondary" onClick={() => setConfirming(true)} className={`${WRAP} text-danger`}>
          {t('withdraw.action')}
        </Button>
      </div>
      {confirming ? (
        <ReturnFocus>
          <ConfirmDialog
            title={t('withdraw.confirmTitle')}
            description={t('withdraw.confirmDescription')}
            confirmLabel={withdraw.isPending ? t('withdraw.withdrawing') : t('withdraw.confirm')}
            cancelLabel={t('withdraw.cancel')}
            busy={withdraw.isPending}
            error={withdraw.error ? t('withdraw.failed') : undefined}
            onCancel={close}
            onConfirm={onConfirm}
          />
        </ReturnFocus>
      ) : null}
    </Section>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-semibold text-ink">{label}</dt>
      <dd className="text-ink-muted">{children}</dd>
    </div>
  )
}
