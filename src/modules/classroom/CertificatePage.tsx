import { useAppTitle, useWasichaiLinks } from '@wasichai/core'
import { Button, Input, Label } from '@wasichai/ui'
import { ShieldCheck } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { TEXT_LINK } from '../../shared/buttons'
import { formatCivilRange, formatInstant, formatNumber } from '../../shared/format'
import { ProblemState } from '../../shared/ProblemState'
import { PublicHeading, PublicLayout } from '../../shared/PublicLayout'
import { ScreenBody, Section, screenContainer } from '../../shared/Screen'
import { usePublicCertificate } from './api'
import type { Certificate } from './contract'
import { useProblemText } from './parts'
import { CLASSROOM_ROUTES } from './routes'
import { COLOFON_THEME } from '../../theme/themes'
import { DocumentSkeleton } from '../../shared/PageSkeleton'

// la verificación pública de un certificado (ADR-0016): sin sesión, por su código. la misma página es la que se imprime:
// al imprimir solo queda el certificado (sin cabecera, enlaces ni botones)

export function VerifyPage() {
  const { t } = useTranslation('classroom')
  return (
    <PublicLayout fullBleed>
      <div className="border-b border-border bg-surface">
        <div className={`${screenContainer()} pb-6`}>
          <PublicHeading title={t('verify.title')} subtitle={t('verify.subtitle')} />
          <VerifyForm />
        </div>
      </div>
      <ScreenBody>
        <VerifyMeaning />
      </ScreenBody>
    </PublicLayout>
  )
}

// qué comprueba y qué no comprueba la verificación: el certificado queda congelado al emitirse; nada dice de quien lo presenta
function VerifyMeaning() {
  const { t } = useTranslation('classroom')
  return (
    <Section title={t('verify.meaningTitle')}>
      <p className="max-w-prose text-sm text-ink">{t('verify.meaningGeneral')}</p>
    </Section>
  )
}

function VerifyForm({ initial = '' }: { initial?: string }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const navigate = useNavigate()
  const codeId = useId()
  const [code, setCode] = useState(initial)
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
  const { kind, title, description, technical } = useProblemText(query.error, 'certificate')
  let body: ReactNode
  if (query.isError)
    body =
      kind === 'notFound' ? (
        <>
          <div className="border-b border-border bg-surface">
            <div className={`${screenContainer()} pb-6 [overflow-wrap:anywhere]`}>
              <PublicHeading title={t('verify.notFound', { code })} subtitle={t('verify.notFoundHint')} />
              {/* el código escrito, a mano para corregirlo. con la clave: al probar otro, el campo empieza por él */}
              <VerifyForm key={code} initial={code} />
            </div>
          </div>
          <ScreenBody>
            <VerifyMeaning />
          </ScreenBody>
        </>
      ) : (
        <div className={screenContainer()}>
          <ProblemState title={title} description={description} technical={technical}>
            <Button variant="secondary" onClick={() => void query.refetch()}>
              {t('problem.retry')}
            </Button>
          </ProblemState>
        </div>
      )
  else if (!query.data)
    body = (
      <div className={screenContainer()}>
        <DocumentSkeleton label={t('verify.loading')} />
      </div>
    )
  else body = <CertificateView certificate={query.data} />
  return <PublicLayout fullBleed>{body}</PublicLayout>
}

function CertificateView({ certificate }: { certificate: Certificate }) {
  const { t, i18n } = useTranslation('classroom')
  const { appName } = useAppTitle()
  const links = useWasichaiLinks()
  const locale = i18n.language
  const zone = certificate.offering.timeZone
  useDocumentTitle(t('certificate.documentTitle', { name: certificate.holderName, course: certificate.course.title }))
  return (
    <>
      <VerificationBand certificate={certificate} />
      <div className={`${screenContainer()} flex flex-col gap-6 py-6 pb-16 print:p-0`}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 print:hidden">
          <Button onClick={() => window.print()}>{t('certificate.print')}</Button>
          <p className="max-w-prose text-sm text-ink-muted">{t('certificate.printHint')}</p>
        </div>
        {/* el documento: siempre en el tema claro de Colofón, se vea la página como se vea, para que en pantalla y en papel sea el
          mismo; con la proporción de un A4 apaisado desde tableta (en el móvil, una columna) y la hoja entera al imprimir */}
        <article
          aria-labelledby="certificate-holder"
          data-theme={COLOFON_THEME.id}
          style={{ colorScheme: COLOFON_THEME.colorScheme }}
          className="flex flex-col items-center justify-center gap-5 rounded-card border-2 border-border bg-surface px-6 py-10 text-center text-ink sm:aspect-[297/210] sm:px-12 print:fixed print:inset-0 print:aspect-auto print:rounded-none print:border-0 print:px-[18mm] print:py-[14mm] print:[print-color-adjust:exact]"
        >
          {appName ? <p className="text-sm font-semibold tracking-widest text-ink-muted uppercase">{appName}</p> : null}
          <p className="text-2xl font-semibold tracking-tight">{t('certificate.heading')}</p>
          <p className="text-sm text-ink-muted">{t('certificate.certifies')}</p>
          <h1 id="certificate-holder" className="font-read text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {certificate.holderName}
          </h1>
          <p className="max-w-prose font-read text-lg font-semibold">
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
        <Link to={links.to(CLASSROOM_ROUTES.verify)} className={`${TEXT_LINK} self-start print:hidden`}>
          {t('verify.another')}
        </Link>
      </div>
    </>
  )
}

// el resultado de la verificación, con icono y palabra, a todo el ancho y fuera del papel: al imprimir no sale
function VerificationBand({ certificate }: { certificate: Certificate }) {
  const { t, i18n } = useTranslation('classroom')
  return (
    <div className="border-b border-success bg-success-soft print:hidden">
      <div className={`${screenContainer()} flex flex-col gap-3 py-5`}>
        <div role="status" className="flex items-start gap-3">
          <ShieldCheck aria-hidden="true" className="size-6 shrink-0 text-success" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-h4 text-success">{t('verify.valid')}</p>
            <p className="max-w-prose text-sm text-ink">{t('verify.meaning')}</p>
          </div>
        </div>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 sm:pl-9 lg:grid-cols-4">
          <BandFact label={t('verify.holder')}>{certificate.holderName}</BandFact>
          <BandFact label={t('certificate.courseCode')}>{certificate.course.title}</BandFact>
          <BandFact label={t('verify.codeLabel')}>
            <span className="font-mono tracking-wider break-all">{certificate.code}</span>
          </BandFact>
          <BandFact label={t('certificate.issuedAt')}>{formatInstant(certificate.issuedAt, i18n.language, certificate.offering.timeZone)}</BandFact>
        </dl>
      </div>
    </div>
  )
}

function BandFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium text-ink">{children}</dd>
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
