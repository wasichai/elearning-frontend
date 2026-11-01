import { ApiError, useAuth, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { formatCivilRange } from '../../shared/format'
import { useEnroll } from './api'
import type { Offering } from './contract'
import { offeringState } from './parts'
import { CLASSROOM_ROUTE } from './routes'

// matricularse desde la ficha, en una edición con la inscripción abierta (completa o cerrada, no se ofrece). sin sesión, el camino es el inicio de sesión
// de Wasichai, que después vuelve a esta ficha (returnTo, @wasichai/core 1.5.0; lo valida LoginPage). con sesión
// matricula y abre el aula de esa matrícula. la ventana y el cupo los decide el servidor.
export function EnrollAction({ offering }: { offering: Offering }) {
  const { user } = useAuth()
  const links = useWasichaiLinks()
  // sin el módulo del aula no hay adónde llevar a la persona matriculada
  if (offeringState(offering) !== 'open' || !links.has(CLASSROOM_ROUTE)) return null
  return user ? <EnrollButton offering={offering} /> : <SignInToEnroll />
}

function SignInToEnroll() {
  const { t } = useTranslation('catalog')
  const links = useWasichaiLinks()
  // la ruta del router, no window.location: el router pone el basename
  const location = useLocation()
  return (
    <Button asChild variant="secondary" className="self-start">
      <Link to={links.login({ returnTo: location.pathname + location.search })}>{t('enroll.signIn')}</Link>
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
      <Button onClick={onEnroll} disabled={enroll.isPending} aria-label={t('enroll.actionLabel', { dates })}>
        {enroll.isPending ? t('enroll.enrolling') : t('enroll.action')}
      </Button>
      {enroll.error ? <EnrollProblem error={enroll.error} /> : null}
    </div>
  )
}

// por qué no se pudo, en palabras de la persona. un 409 tiene varios motivos (cerrada, sin cupo, prerrequisito sin
// cumplir: docs/api/lms.md) y solo el servidor sabe cuál: su detail legible es la causa; sin él, un texto que no la adivina
function EnrollProblem({ error }: { error: unknown }) {
  const { t } = useTranslation('catalog')
  const status = error instanceof ApiError ? error.status : undefined
  const message =
    status === 409
      ? (conflictDetail(error) ?? t('enroll.conflict'))
      : status === 404
        ? t('enroll.unavailable')
        : status === 403
          ? t('enroll.forbidden')
          : t('enroll.failed')
  return (
    <p role="alert" className="max-w-prose text-sm text-danger">
      {message}
    </p>
  )
}

// core pone en message el detail del problem+json; sin detail, el título o el estado HTTP («Conflict», «HTTP 409»), que no
// explican nada a la persona
const NO_DETAIL = /^(conflict|http 409)$/i

function conflictDetail(error: unknown): string | undefined {
  const message = error instanceof ApiError ? error.message.trim() : ''
  return message && !NO_DETAIL.test(message) ? message : undefined
}
