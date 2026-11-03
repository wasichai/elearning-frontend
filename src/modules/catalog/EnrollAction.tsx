import { ApiError, useAuth, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { WRAP } from '../../shared/buttons'
import { formatCivilRange } from '../../shared/format'
import { RETURN_TO_PARAM, TERMS_ROUTE, useTermsRefusal, type TermsRefusal } from '../../shared/terms'
import { useEnroll } from './api'
import type { Offering } from './contract'
import { offeringState } from './parts'
import { CLASSROOM_ROUTE } from './routes'

// matricularse desde la ficha, en una edición con la inscripción abierta (completa o cerrada, no se ofrece). sin sesión, el camino es el inicio de sesión
// de Wasichai, que después vuelve a esta ficha (returnTo, @wasichai/core 1.5.0; lo valida LoginPage). con sesión
// matricula y abre el aula de esa matrícula. la ventana y el cupo los decide el servidor. un 403 por no tener aceptados los términos lleva a ellos
// (ADR-0037 del backend), y de allí se vuelve a la ficha para matricularse: aceptar no matricula sin pedirlo.
// solo una de la pantalla es la primaria: quien lo monta dice cuál (primary)
export function EnrollAction({ offering, primary = true }: { offering: Offering; primary?: boolean }) {
  const { user } = useAuth()
  const links = useWasichaiLinks()
  // sin el módulo del aula no hay adónde llevar a la persona matriculada
  if (offeringState(offering) !== 'open' || !links.has(CLASSROOM_ROUTE)) return null
  return user ? <EnrollButton offering={offering} primary={primary} /> : <SignInToEnroll primary={primary} />
}

// ya matriculada: la vuelta al aula de esa matrícula
export function GoToCourse({ enrollmentId, primary = true }: { enrollmentId: string; primary?: boolean }) {
  const { t } = useTranslation('catalog')
  const links = useWasichaiLinks()
  return (
    <Button asChild variant={primary ? 'primary' : 'secondary'} className={`${WRAP} w-full`}>
      <Link to={links.to(CLASSROOM_ROUTE, { enrollmentId })}>{t('enroll.goToCourse')}</Link>
    </Button>
  )
}

function SignInToEnroll({ primary }: { primary: boolean }) {
  const { t } = useTranslation('catalog')
  const links = useWasichaiLinks()
  // la ruta del router, no window.location: el router pone el basename
  const location = useLocation()
  return (
    <Button asChild variant={primary ? 'primary' : 'secondary'} className={`${WRAP} w-full`}>
      <Link to={links.login({ returnTo: location.pathname + location.search })}>{t('enroll.signIn')}</Link>
    </Button>
  )
}

function EnrollButton({ offering, primary }: { offering: Offering; primary: boolean }) {
  const { t, i18n } = useTranslation('catalog')
  const links = useWasichaiLinks()
  const navigate = useNavigate()
  const location = useLocation()
  const enroll = useEnroll()
  const refusal = useTermsRefusal(enroll.error)
  const checking = refusal === 'checking'
  const toTerms = refusal === 'terms' && links.has(TERMS_ROUTE) ? links.to(TERMS_ROUTE, {}, { [RETURN_TO_PARAM]: location.pathname + location.search }) : null
  useEffect(() => {
    if (toTerms) void navigate(toTerms)
  }, [toTerms, navigate])
  const dates = formatCivilRange(offering.startDate, offering.endDate, offering.timeZone, i18n.language)
  const onEnroll = () => enroll.mutate(offering.code, { onSuccess: (enrollment) => void navigate(links.to(CLASSROOM_ROUTE, { enrollmentId: enrollment.id })) })
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={primary ? 'primary' : 'secondary'}
        onClick={onEnroll}
        disabled={enroll.isPending || checking}
        aria-label={t('enroll.actionLabel', { dates })}
        className={`${WRAP} w-full`}
      >
        {enroll.isPending || checking ? t('enroll.enrolling') : t('enroll.action')}
      </Button>
      {enroll.error && !checking && !toTerms ? <EnrollProblem error={enroll.error} refusal={refusal} /> : null}
    </div>
  )
}

// por qué no se pudo, en palabras de la persona. un 409 tiene varios motivos (cerrada, sin cupo, prerrequisito sin
// cumplir: docs/api/lms.md) y solo el servidor sabe cuál: su detail legible es la causa; sin él, un texto que no la adivina
function EnrollProblem({ error, refusal }: { error: unknown; refusal: TermsRefusal }) {
  const { t } = useTranslation('catalog')
  const status = error instanceof ApiError ? error.status : undefined
  const message =
    status === 409
      ? (conflictDetail(error) ?? t('enroll.conflict'))
      : status === 404
        ? t('enroll.unavailable')
        : refusal === 'terms'
          ? t('enroll.termsRequired')
          : refusal === 'other'
            ? t('enroll.forbidden')
            : refusal === 'unknown'
              ? t('enroll.forbiddenUnknown')
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
