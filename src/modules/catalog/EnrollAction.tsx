import { ApiError, useAuth, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { formatCivilRange } from '../../shared/format'
import { useEnroll } from './api'
import type { Offering } from './contract'
import { CLASSROOM_ROUTE } from './routes'

// matricularse desde la ficha, en una edición con la inscripción abierta. sin sesión, el camino es el inicio de sesión
// de Wasichai: @wasichai/core 1.3.0 no sabe volver a esta página después (README, «Limitaciones»), así que el botón lo
// dice tal cual. con sesión matricula y abre el aula de esa matrícula. la ventana y el cupo los decide el servidor.
export function EnrollAction({ offering }: { offering: Offering }) {
  const { user } = useAuth()
  const links = useWasichaiLinks()
  // sin el módulo del aula no hay adónde llevar a la persona matriculada
  if (!offering.enrollmentOpen || !links.has(CLASSROOM_ROUTE)) return null
  return user ? <EnrollButton offering={offering} /> : <SignInToEnroll />
}

function SignInToEnroll() {
  const { t } = useTranslation('catalog')
  const links = useWasichaiLinks()
  return (
    <Button asChild variant="secondary" size="sm" className="self-start">
      <Link to={links.login()}>{t('enroll.signIn')}</Link>
    </Button>
  )
}

function EnrollButton({ offering }: { offering: Offering }) {
  const { t, i18n } = useTranslation('catalog')
  const links = useWasichaiLinks()
  const navigate = useNavigate()
  const enroll = useEnroll()
  const dates = formatCivilRange(offering.startDate, offering.endDate, offering.timeZone, i18n.language)
  const onEnroll = () => enroll.mutate(offering.code, { onSuccess: (enrollment) => void navigate(links.to(CLASSROOM_ROUTE, { enrollmentId: enrollment.id })) })
  return (
    <div className="flex flex-col items-start gap-2">
      <Button size="sm" onClick={onEnroll} disabled={enroll.isPending} aria-label={t('enroll.actionLabel', { dates })}>
        {enroll.isPending ? t('enroll.enrolling') : t('enroll.action')}
      </Button>
      {enroll.error ? <EnrollProblem error={enroll.error} /> : null}
    </div>
  )
}

// por qué no se pudo, en palabras de la persona; el detalle del servidor (legible, docs/api/lms.md) lo completa en un 409
function EnrollProblem({ error }: { error: unknown }) {
  const { t } = useTranslation('catalog')
  const status = error instanceof ApiError ? error.status : undefined
  const message = status === 409 ? t('enroll.closed') : status === 404 ? t('enroll.unavailable') : status === 403 ? t('enroll.forbidden') : t('enroll.failed')
  return (
    <div role="alert" className="flex max-w-prose flex-col gap-0.5 text-sm">
      <p className="text-danger">{message}</p>
      {status === 409 && error instanceof ApiError && error.message ? <p className="text-ink-muted">{error.message}</p> : null}
    </div>
  )
}
