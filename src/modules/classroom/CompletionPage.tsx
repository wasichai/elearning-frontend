import { ApiError, LoadingState, useAuth, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button, Input, Label } from '@wasichai/ui'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ProblemState } from '../../shared/ProblemState'
import { useCompletion, useRequestCertificate } from './api'
import { HOLDER_NAME_MAX, type Certificate, type Classroom, type CompletionRule } from './contract'
import { CourseSubpage } from './CourseSubpage'
import { useProblemText, WRAP } from './parts'
import { CLASSROOM_ROUTES } from './routes'

// la finalización de una matrícula (ADR-0016): las reglas de la versión, cuáles se cumplen, y el certificado
export function CompletionPage() {
  const { t } = useTranslation('classroom')
  return <CourseSubpage subtitle={t('completionPanel.title')}>{(classroom) => <CompletionPanel classroom={classroom} />}</CourseSubpage>
}

function CompletionPanel({ classroom }: { classroom: Classroom }) {
  const { t } = useTranslation('classroom')
  const query = useCompletion(classroom.id)
  const { title, description } = useProblemText(query.error, 'completion')
  if (query.isError)
    return (
      <ProblemState title={title} description={description}>
        <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
          {t('problem.retry')}
        </Button>
      </ProblemState>
    )
  if (!query.data) return <LoadingState label={t('completionPanel.loading')} />
  const completion = query.data
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="completion-rules" className="flex flex-col gap-3">
        <h2 id="completion-rules" className="text-lg font-semibold text-ink">
          {t('completionPanel.rules')}
        </h2>
        {completion.rules.length === 0 ? <p className="text-sm text-ink-muted">{t('completionPanel.noRules')}</p> : <RuleList rules={completion.rules} />}
        <p role="status" className={`text-sm font-medium ${completion.met ? 'text-success' : 'text-ink'}`}>
          {completion.met ? t('completionPanel.met') : t('completionPanel.notMet')}
        </p>
      </section>
      <CertificateSection classroom={classroom} met={completion.met} />
    </div>
  )
}

export function RuleList({ rules }: { rules: CompletionRule[] }) {
  const { t } = useTranslation('classroom')
  return (
    <ul className="flex flex-col gap-2">
      {rules.map((rule) => (
        <li key={rule.rule} className="flex items-start gap-3 rounded-md border border-border px-4 py-3 text-sm">
          <span aria-hidden="true" className={`mt-0.5 font-semibold ${rule.met ? 'text-success' : 'text-ink-muted'}`}>
            {rule.met ? '✓' : '○'}
          </span>
          <span className="flex flex-col">
            <span className="font-medium text-ink">
              {t(`completionPanel.rule.${rule.rule}`)}
              <span className="sr-only"> {rule.met ? t('completionPanel.ruleMet') : t('completionPanel.rulePending')}</span>
            </span>
            <span className="text-ink-muted">{rule.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function CertificateSection({ classroom, met }: { classroom: Classroom; met: boolean }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const { user } = useAuth()
  const nameId = useId()
  const [name, setName] = useState(user?.displayName ?? '')
  const [problem, setProblem] = useState<string>()
  const request = useRequestCertificate(classroom.id)
  const issued: Certificate | undefined = request.data
  const code = issued?.code ?? classroom.certificateCode ?? undefined
  const certificateLink = (value: string) => (
    <Button asChild className={`self-start ${WRAP}`}>
      <Link to={links.to(CLASSROOM_ROUTES.certificate, { code: value })}>{t('certificate.view')}</Link>
    </Button>
  )
  if (code)
    return (
      <section aria-labelledby="certificate-issued" className="flex flex-col gap-3 rounded-card border border-border bg-surface-muted px-5 py-4">
        <h2 id="certificate-issued" className="text-lg font-semibold text-ink">
          {t('certificate.issuedTitle')}
        </h2>
        {issued ? (
          <p role="status" className="text-sm text-ink">
            {issued.holderName.trim() === name.trim()
              ? t('certificate.issued', { name: issued.holderName })
              : t('certificate.alreadyIssued', { name: issued.holderName })}
          </p>
        ) : null}
        <p className="text-sm text-ink-muted">{t('certificate.code', { code })}</p>
        {certificateLink(code)}
      </section>
    )
  const submit = () => {
    const holderName = name.trim()
    if (holderName.length === 0 || holderName.length > HOLDER_NAME_MAX) {
      setProblem(t('certificate.nameInvalid', { max: HOLDER_NAME_MAX }))
      return
    }
    setProblem(undefined)
    request.mutate(holderName)
  }
  return (
    <section aria-labelledby="certificate-request" className="flex flex-col gap-3 rounded-card border border-border px-5 py-4">
      <h2 id="certificate-request" className="text-lg font-semibold text-ink">
        {t('certificate.requestTitle')}
      </h2>
      {met ? (
        <form
          className="flex flex-col items-start gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <div className="flex w-full max-w-md flex-col gap-1.5">
            <Label htmlFor={nameId}>{t('certificate.name')}</Label>
            <Input
              id={nameId}
              value={name}
              maxLength={HOLDER_NAME_MAX}
              autoComplete="name"
              aria-describedby={`${nameId}-hint`}
              aria-invalid={problem ? true : undefined}
              onChange={(event) => setName(event.target.value)}
            />
            <p id={`${nameId}-hint`} className="text-xs text-ink-muted">
              {t('certificate.nameHint', { max: HOLDER_NAME_MAX })}
            </p>
          </div>
          {problem ? <Alert tone="danger">{problem}</Alert> : null}
          {request.error ? <RequestProblem error={request.error} /> : null}
          <Button type="submit" className={WRAP} disabled={request.isPending}>
            {request.isPending ? t('certificate.requesting') : t('certificate.request')}
          </Button>
        </form>
      ) : (
        <>
          <p className="text-sm text-ink-muted">{t('certificate.notYet')}</p>
          {request.error ? <RequestProblem error={request.error} /> : null}
        </>
      )}
    </section>
  )
}

// el servidor manda: un 409 dice que aún falta alguna regla (la lista de arriba ya se volvió a leer), un 400 que el nombre no vale
function RequestProblem({ error }: { error: unknown }) {
  const { t } = useTranslation('classroom')
  if (error instanceof ApiError && error.status === 409) return <Alert tone="warning">{t('certificate.pendingRules')}</Alert>
  if (error instanceof ApiError && error.status === 400) return <Alert tone="danger">{t('certificate.nameInvalid', { max: HOLDER_NAME_MAX })}</Alert>
  return <Alert tone="danger">{error instanceof ApiError ? t('certificate.failedStatus', { status: error.status }) : t('certificate.failed')}</Alert>
}
