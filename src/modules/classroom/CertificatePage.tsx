import { LoadingState, useAppTitle, useWasichaiLinks } from '@wasichai/core'
import { Button, Input, Label } from '@wasichai/ui'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { formatCivilRange, formatInstant, formatNumber } from '../../shared/format'
import { ProblemState } from '../../shared/ProblemState'
import { PublicHeading, PublicLayout } from '../../shared/PublicLayout'
import { usePublicCertificate } from './api'
import type { Certificate } from './contract'
import { useProblemText } from './parts'
import { CLASSROOM_ROUTES } from './routes'

// la verificación pública de un certificado (ADR-0016): sin sesión, por su código. la misma página es la que se imprime:
// al imprimir solo queda el certificado (sin cabecera, enlaces ni botones)

export function VerifyPage() {
  const { t } = useTranslation('classroom')
  return (
    <PublicLayout>
      <PublicHeading title={t('verify.title')} subtitle={t('verify.subtitle')} />
      <VerifyForm />
    </PublicLayout>
  )
}

function VerifyForm() {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const navigate = useNavigate()
  const codeId = useId()
  const [code, setCode] = useState('')
  return (
    <form
      role="search"
      className="flex max-w-md flex-col gap-2 print:hidden"
      onSubmit={(event) => {
        event.preventDefault()
        const value = code.trim().toUpperCase()
        if (value) void navigate(links.to(CLASSROOM_ROUTES.certificate, { code: value }))
      }}
    >
      <Label htmlFor={codeId}>{t('verify.code')}</Label>
      <div className="flex gap-2">
        <Input
          id={codeId}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder={t('verify.placeholder')}
        />
        <Button type="submit" variant="secondary">
          {t('verify.submit')}
        </Button>
      </div>
    </form>
  )
}

export function CertificatePage() {
  const { t } = useTranslation('classroom')
  const { code = '' } = useParams()
  const query = usePublicCertificate(code)
  const { kind, title, description } = useProblemText(query.error, 'certificate')
  let body: ReactNode
  if (query.isError)
    body =
      kind === 'notFound' ? (
        <>
          <PublicHeading title={t('verify.notFound')} subtitle={t('verify.notFoundHint', { code })} />
          <VerifyForm />
        </>
      ) : (
        <ProblemState title={title} description={description}>
          <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
            {t('problem.retry')}
          </Button>
        </ProblemState>
      )
  else if (!query.data) body = <LoadingState label={t('verify.loading')} />
  else body = <CertificateView certificate={query.data} />
  return <PublicLayout>{body}</PublicLayout>
}

function CertificateView({ certificate }: { certificate: Certificate }) {
  const { t, i18n } = useTranslation('classroom')
  const { appName } = useAppTitle()
  const links = useWasichaiLinks()
  const locale = i18n.language
  const zone = certificate.offering.timeZone
  useDocumentTitle(t('certificate.documentTitle', { name: certificate.holderName, course: certificate.course.title }))
  return (
    <div className="flex flex-col gap-6 pt-10 print:pt-0">
      <p role="status" className="text-sm font-medium text-success print:hidden">
        {t('verify.valid')}
      </p>
      <article
        aria-labelledby="certificate-holder"
        className="flex flex-col items-center gap-5 rounded-card border-2 border-border px-6 py-10 text-center text-ink sm:px-12 print:border-ink print:py-16"
      >
        {appName ? <p className="text-sm font-semibold tracking-widest text-ink-muted uppercase">{appName}</p> : null}
        <p className="text-2xl font-semibold tracking-tight">{t('certificate.heading')}</p>
        <p className="text-sm text-ink-muted">{t('certificate.certifies')}</p>
        <h1 id="certificate-holder" className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {certificate.holderName}
        </h1>
        <p className="max-w-prose text-base">
          {t(certificate.result === 'APROBADO' ? 'certificate.passedCourse' : 'certificate.completedCourse', { course: certificate.course.title })}
        </p>
        <dl className="grid w-full max-w-xl gap-x-8 gap-y-3 text-left text-sm sm:grid-cols-2">
          <Fact label={t('certificate.courseCode')}>{t('certificate.courseVersion', { code: certificate.course.code, version: certificate.version })}</Fact>
          <Fact label={t('certificate.offering')}>{formatCivilRange(certificate.offering.startDate, certificate.offering.endDate, zone, locale)}</Fact>
          <Fact label={t('certificate.hours')}>{t('certificate.hoursValue', { value: formatNumber(certificate.totalHours, locale) })}</Fact>
          <Fact label={t('certificate.issuedAt')}>{formatInstant(certificate.issuedAt, locale, zone)}</Fact>
        </dl>
        {certificate.rules.length > 0 ? (
          <ul className="flex w-full max-w-xl flex-col gap-1 text-left text-sm text-ink-muted">
            {certificate.rules.map((rule) => (
              <li key={rule.rule}>{t('certificate.rule', { rule: t(`completionPanel.rule.${rule.rule}`), detail: rule.detail })}</li>
            ))}
          </ul>
        ) : null}
        <p className="pt-2 font-mono text-sm tracking-wider">{t('certificate.verifyCode', { code: certificate.code })}</p>
        <p className="text-xs text-ink-muted">{t('certificate.verifyAt', { url: window.location.href })}</p>
      </article>
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button onClick={() => window.print()}>{t('certificate.print')}</Button>
        <Link to={links.to(CLASSROOM_ROUTES.verify)} className="text-sm text-link underline-offset-4 hover:underline">
          {t('verify.another')}
        </Link>
      </div>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

// el título del documento es el nombre del archivo al «guardar como PDF» desde el diálogo de impresión
function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
