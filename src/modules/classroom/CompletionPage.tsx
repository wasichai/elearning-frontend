import { ApiError, useAuth, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button, ConfirmDialog, Input, Label } from '@wasichai/ui'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ProblemState } from '../../shared/ProblemState'
import { StatusBadge } from '../../shared/StatusBadge'
import { useCompletion, useRequestCertificate } from './api'
import { HOLDER_NAME_MAX, type Certificate, type Classroom, type CompletionRule } from './contract'
import { CourseSubpage } from './CourseSubpage'
import { useProblemText, WRAP } from './parts'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'
import { DocumentSkeleton } from '../../shared/PageSkeleton'

// la finalización de una matrícula (ADR-0016): las reglas de la versión, cuáles se cumplen, y el certificado
export function CompletionPage() {
  const { t } = useTranslation('classroom')
  return <CourseSubpage subtitle={t('completionPanel.title')}>{(classroom) => <CompletionPanel classroom={classroom} />}</CourseSubpage>
}

function CompletionPanel({ classroom }: { classroom: Classroom }) {
  const { t } = useTranslation('classroom')
  const query = useCompletion(classroom.id)
  const { title, description, technical } = useProblemText(query.error, 'completion')
  if (query.isError)
    return (
      <ProblemState title={title} description={description} technical={technical}>
        <Button variant="secondary" onClick={() => void query.refetch()}>
          {t('problem.retry')}
        </Button>
      </ProblemState>
    )
  if (!query.data) return <DocumentSkeleton label={t('completionPanel.loading')} />
  const completion = query.data
  // sin reglas declaradas se puede pedir el certificado, pero no hay logro que contar: cumplir «nada» no se celebra
  const celebrate = completion.met && completion.rules.length > 0
  return (
    <div className="flex flex-col gap-6">
      {celebrate ? (
        <Achievement classroom={classroom} rules={completion.rules} />
      ) : (
        <section aria-labelledby="completion-rules" className="flex flex-col gap-3">
          <h2 id="completion-rules" className="text-title-3 text-ink">
            {t('completionPanel.rules')}
          </h2>
          <p role="status" className="text-sm font-medium text-ink">
            {completion.met
              ? t('completionPanel.met')
              : t('completionPanel.notMet', { missing: completion.rules.filter((rule) => !rule.met).length, count: completion.rules.length })}
          </p>
          {completion.rules.length === 0 ? <p className="text-sm text-ink-muted">{t('completionPanel.noRules')}</p> : <RuleList rules={completion.rules} />}
          {completion.met ? null : <NextStep classroom={classroom} />}
        </section>
      )}
      <CertificateSection classroom={classroom} met={completion.met} />
    </div>
  )
}

// el logro, contenido: el sello y las cifras del servidor, sin adjetivos. maíz solo aquí: el bloque en maiz-soft y el sello en maiz
function Achievement({ classroom, rules }: { classroom: Classroom; rules: CompletionRule[] }) {
  const { t } = useTranslation('classroom')
  return (
    <section aria-labelledby="completion-achievement" className="flex flex-col gap-4 rounded-lg bg-maiz-soft p-5 text-ink sm:flex-row sm:items-start sm:gap-5">
      <Seal />
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="completion-achievement" className="text-title-3 text-balance">
            {t('completionPanel.achieved', { course: classroom.course.title })}
          </h2>
          <p role="status" className="text-sm">
            {t(classroom.certificateCode ? 'completionPanel.metIssued' : 'completionPanel.met')}
          </p>
        </div>
        <dl className="flex flex-col gap-1 text-sm">
          {rules.map((rule) => (
            <div key={rule.rule} className="flex flex-col sm:flex-row sm:gap-3">
              <dt>{t(`completionPanel.rule.${rule.rule}`)}</dt>
              <dd className="font-semibold tabular-nums">{rule.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

// el sello de maíz (PantallaFinalizacion): se anuda una sola vez al cumplir todas las reglas; con movimiento reducido
// aparece quieto. decorativo: lo dice el texto de al lado. sin confeti ni sonido: las cifras son el premio.
function Seal() {
  return (
    <span
      aria-hidden="true"
      data-seal=""
      className="grid size-14 shrink-0 animate-seal place-items-center rounded-full bg-maiz text-on-maiz motion-reduce:animate-none"
    >
      <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {/* un nudo sobre su cordón */}
        <path d="M1.5 12h4M18.5 12h4" />
        <circle cx="12" cy="12" r="6.5" />
        <path d="m9 12.2 2.1 2.1 4-4.3" />
      </svg>
    </span>
  )
}

// lo que falta, primero; lo cumplido, después. cada regla con su estado y el detalle que da el servidor
function RuleList({ rules }: { rules: CompletionRule[] }) {
  const { t } = useTranslation('classroom')
  const ordered = [...rules.filter((rule) => !rule.met), ...rules.filter((rule) => rule.met)]
  return (
    <ul className="flex flex-col divide-y divide-border border-y border-border">
      {ordered.map((rule) => (
        <li key={rule.rule} className="flex flex-col items-start gap-1.5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-col">
            <span className="font-medium text-ink">{t(`completionPanel.rule.${rule.rule}`)}</span>
            <span className="text-ink-muted tabular-nums">{rule.detail}</span>
          </div>
          <StatusBadge state={rule.met ? 'done' : 'todo'}>{t(rule.met ? 'completionPanel.ruleMet' : 'completionPanel.rulePending')}</StatusBadge>
        </li>
      ))}
    </ul>
  )
}

// con lecciones por hacer, la siguiente acción es seguir con el curso
function NextStep({ classroom }: { classroom: Classroom }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  if (!classroom.nextLesson) return null
  return (
    <Button asChild className={`self-start ${WRAP}`}>
      <Link to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId: classroom.id }, { [LESSON_PARAM]: classroom.nextLesson.id })}>
        {t('completionPanel.continue', { lesson: classroom.nextLesson.title })}
      </Link>
    </Button>
  )
}

function CertificateSection({ classroom, met }: { classroom: Classroom; met: boolean }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const { user } = useAuth()
  const nameId = useId()
  const [name, setName] = useState(user?.displayName ?? '')
  const [problem, setProblem] = useState<string>()
  // el nombre que se va a emitir, mientras se confirma
  const [confirming, setConfirming] = useState<string>()
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
      <section aria-labelledby="certificate-issued" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
        <h2 id="certificate-issued" className="text-title-3 text-ink">
          {t('certificate.issuedTitle')}
        </h2>
        {issued ? (
          <p role="status" className="text-sm text-ink">
            {issued.holderName.trim() === name.trim()
              ? t('certificate.issued', { name: issued.holderName })
              : t('certificate.alreadyIssued', { name: issued.holderName })}
          </p>
        ) : null}
        <p className="text-sm text-ink-muted">{t('certificate.shareHint')}</p>
        <p className="font-mono text-sm tracking-wider break-all text-ink">{t('certificate.code', { code })}</p>
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
    // el nombre queda en el certificado y no se cambia después: se confirma antes de emitir (RNF-UX-08)
    setConfirming(holderName)
  }
  return (
    <section aria-labelledby="certificate-request" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
      <h2 id="certificate-request" className="text-title-3 text-ink">
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
      {confirming ? (
        <ConfirmDialog
          variant="primary"
          title={t('certificate.confirmTitle', { name: confirming })}
          description={t('certificate.confirmDescription')}
          confirmLabel={t('certificate.confirmIssue')}
          cancelLabel={t('certificate.confirmCancel')}
          onCancel={() => setConfirming(undefined)}
          onConfirm={() => {
            setConfirming(undefined)
            request.mutate(confirming)
          }}
        />
      ) : null}
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
