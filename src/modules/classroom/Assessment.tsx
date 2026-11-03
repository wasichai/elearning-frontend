import { useApiClient, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button, ConfirmDialog } from '@wasichai/ui'
import { useQuery } from '@tanstack/react-query'
import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { TEXT_LINK } from '../../shared/buttons'
import { formatNumber } from '../../shared/format'
import { ReturnFocus } from '../../shared/ReturnFocus'
import { classroomQuery, useStartAttempt } from './api'
import { AttemptActionProblem, AttemptView } from './AttemptView'
import type { AssessmentSummary, Lesson } from './contract'
import { WRAP } from './parts'
import { attemptKnots, Knot, type KnotState } from './Quipu'
import { ATTEMPT_PARAM, CLASSROOM_ROUTES, LESSON_PARAM } from './routes'

type AssessedLesson = Lesson & { assessment: AssessmentSummary }

// una evaluación es una lección del aula (ADR-0016): sus reglas y lo hecho, y el intento abierto en la misma lección
// (?intento=<id>), así la navegación por unidades sigue a mano
export function AssessmentLesson({ enrollmentId, lesson, timeZone }: { enrollmentId: string; lesson: AssessedLesson; timeZone: string }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const [params] = useSearchParams()
  const attemptId = params.get(ATTEMPT_PARAM)
  if (!attemptId) return <AssessmentPanel enrollmentId={enrollmentId} lesson={lesson} />
  return (
    <div className="flex flex-col gap-2">
      <Link to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId }, { [LESSON_PARAM]: lesson.id })} className={`self-start ${TEXT_LINK}`}>
        {t('assessment.back')}
      </Link>
      <AttemptView
        enrollmentId={enrollmentId}
        attemptId={attemptId}
        passingPercent={lesson.assessment.passingPercent}
        title={lesson.assessment.title}
        maxAttempts={lesson.assessment.maxAttempts}
        timeZone={timeZone}
        resultActions={<ResultActions enrollmentId={enrollmentId} lesson={lesson} />}
      />
    </div>
  )
}

// empezar un intento, desde la ficha o desde un resultado: cuándo se puede, con su confirmación. el servidor manda; esto lo explica antes
function useAttemptStart(enrollmentId: string, lesson: AssessedLesson) {
  const { t, i18n } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const navigate = useNavigate()
  const start = useStartAttempt(enrollmentId)
  const [confirming, setConfirming] = useState(false)
  // el aula ya está en la caché del marco: solo se lee su estado, sin otra petición
  const { data: classroom } = useQuery({ ...classroomQuery(useApiClient(), enrollmentId), refetchOnMount: false })
  const { assessment } = lesson
  const locale = i18n.language
  const open = assessment.openAttemptId
  const exhausted = open === null && assessment.attemptsUsed >= assessment.maxAttempts
  // el servidor solo deja escribir con la matrícula activa: aquí se explica antes de que responda 409
  const closed = classroom !== undefined && classroom.status !== 'ACTIVA'
  const canStart = !closed && !exhausted && open === null
  const numbers = { number: formatNumber(assessment.attemptsUsed + 1, locale), max: formatNumber(assessment.maxAttempts, locale) }
  const attemptLink = (attemptId: string) => links.to(CLASSROOM_ROUTES.classroom, { enrollmentId }, { [LESSON_PARAM]: lesson.id, [ATTEMPT_PARAM]: attemptId })
  // empezar gasta uno de los intentos y, con límite, pone en marcha un reloj que no se detiene: se confirma (RNF-UX-08)
  const dialog = confirming ? (
    <ReturnFocus>
      <ConfirmDialog
        variant="primary"
        title={t('assessment.confirmTitle')}
        description={
          assessment.timeLimitMinutes === null
            ? t('assessment.confirmUntimed', numbers)
            : t('assessment.confirmTimed', { ...numbers, minutes: formatNumber(assessment.timeLimitMinutes, locale) })
        }
        confirmLabel={t('assessment.confirmStart')}
        cancelLabel={t('assessment.confirmCancel')}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          start.mutate(lesson.id, { onSuccess: (attempt) => void navigate(attemptLink(attempt.id)) })
        }}
      />
    </ReturnFocus>
  ) : null
  const closedNotice = closed ? t(classroom.status === 'FINALIZADA' ? 'assessment.closedFinished' : 'assessment.closedInactive') : undefined
  return { open, exhausted, closedNotice, canStart, numbers, attemptLink, start, ask: () => setConfirming(true), dialog }
}

// la salida de un resultado: dentro de ?intento= la lección oculta anterior y siguiente, así que aquí se dice adónde ir
function ResultActions({ enrollmentId, lesson }: { enrollmentId: string; lesson: AssessedLesson }) {
  const { t, i18n } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const flow = useAttemptStart(enrollmentId, lesson)
  const { assessment } = lesson
  const left = assessment.maxAttempts - assessment.attemptsUsed
  const note = flow.closedNotice
    ? flow.closedNotice
    : flow.exhausted
      ? t('assessment.exhausted', { count: assessment.maxAttempts })
      : flow.canStart
        ? t('result.attemptsLeft', { count: left, value: formatNumber(left, i18n.language) })
        : null
  return (
    <div className="flex flex-col gap-3">
      {flow.start.error ? <AttemptActionProblem error={flow.start.error} /> : null}
      <div className="flex flex-col gap-2 @lg:flex-row @lg:items-center @lg:gap-3">
        <Button asChild className={`w-full @lg:w-auto ${WRAP} min-h-11`}>
          <Link to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId })}>{t('result.backToCourse')}</Link>
        </Button>
        {flow.canStart ? (
          <Button variant="secondary" className={`w-full @lg:w-auto ${WRAP} min-h-11`} disabled={flow.start.isPending} onClick={flow.ask}>
            {flow.start.isPending ? t('assessment.starting') : t('result.retry')}
          </Button>
        ) : null}
        {note ? <p className="text-sm text-ink-muted">{note}</p> : null}
      </div>
      {flow.dialog}
    </div>
  )
}

const ATTEMPT_STATE: Partial<Record<KnotState, string>> = { used: 'assessment.knotUsed', active: 'assessment.knotCurrent', todo: 'assessment.knotFree' }

function AssessmentPanel({ enrollmentId, lesson }: { enrollmentId: string; lesson: AssessedLesson }) {
  const { t, i18n } = useTranslation('classroom')
  const { open, exhausted, closedNotice, canStart, numbers, attemptLink, start, ask, dialog } = useAttemptStart(enrollmentId, lesson)
  const attemptsLabel = useId()
  const { assessment } = lesson
  const locale = i18n.language
  const timed = assessment.timeLimitMinutes !== null
  const knots = attemptKnots(assessment.maxAttempts, assessment.attemptsUsed - (open ? 1 : 0), open !== null)
  return (
    <section
      aria-labelledby={`assessment-${assessment.id}`}
      className="@container flex flex-col gap-5 rounded-card border border-border bg-surface px-4 py-5 sm:px-6"
    >
      {/* la lección ya lleva su título encima: solo se repite aquí si la evaluación se llama de otro modo */}
      <h3 id={`assessment-${assessment.id}`} className={assessment.title === lesson.title ? 'sr-only' : 'text-title-3 text-ink'}>
        {assessment.title}
      </h3>

      <dl className="grid divide-y divide-border @lg:grid-cols-3 @lg:gap-6 @lg:divide-y-0">
        <Fact label={t('assessment.timeLimit')}>
          {assessment.timeLimitMinutes === null
            ? t('assessment.noTimeLimit')
            : t('classroom.minutes', { value: formatNumber(assessment.timeLimitMinutes, locale) })}
        </Fact>
        <Fact label={t('assessment.passing')}>{t('assessment.percent', { value: formatNumber(assessment.passingPercent, locale) })}</Fact>
        <Fact label={t('assessment.best')}>
          {assessment.best === null
            ? t('assessment.noBest')
            : assessment.best.pending || assessment.best.percent === null
              ? t('assessment.bestPending')
              : t(assessment.best.passed ? 'assessment.bestPassed' : 'assessment.bestFailed', { value: formatNumber(assessment.best.percent, locale) })}
        </Fact>
      </dl>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
          <span id={attemptsLabel} className="font-medium text-ink">
            {t('assessment.attempts')}
          </span>
          <span className="text-ink-muted tabular-nums">
            {t('assessment.attemptsValue', { used: formatNumber(assessment.attemptsUsed, locale), max: formatNumber(assessment.maxAttempts, locale) })}
          </span>
        </p>
        <ul aria-labelledby={attemptsLabel} className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink">
          {knots.map((knot, index) => (
            <li key={index} className="inline-flex items-center gap-2">
              <Knot {...knot} />
              <span>{t('assessment.knot', { number: formatNumber(index + 1, locale), state: t(ATTEMPT_STATE[knot.state] ?? 'assessment.knotFree') })}</span>
            </li>
          ))}
        </ul>
      </div>

      {start.error ? <AttemptActionProblem error={start.error} /> : null}

      {closedNotice ? (
        <Alert tone="notice">{closedNotice}</Alert>
      ) : open ? (
        <div className="flex flex-col gap-3 @lg:flex-row @lg:items-center @lg:justify-between">
          <p className="text-sm text-ink-muted">{t(timed ? 'assessment.resumeTimed' : 'assessment.resumeHint')}</p>
          <Button asChild className={`w-full shrink-0 @lg:w-auto ${WRAP} min-h-11`}>
            <Link to={attemptLink(open)}>{t('assessment.resume')}</Link>
          </Button>
        </div>
      ) : exhausted ? (
        <Alert tone="notice">{t('assessment.exhausted', { count: assessment.maxAttempts })}</Alert>
      ) : (
        <Button className={`w-full self-start @lg:w-auto ${WRAP} min-h-11`} disabled={start.isPending} onClick={ask}>
          {start.isPending ? t('assessment.starting') : t('assessment.startNumber', numbers)}
        </Button>
      )}

      {canStart ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h4 className="text-sm font-medium text-ink">{t('assessment.onStart')}</h4>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-muted">
            <li>{t('assessment.onStartAttempt', numbers)}</li>
            {timed ? <li>{t('assessment.onStartTimer', { value: formatNumber(assessment.timeLimitMinutes!, locale) })}</li> : null}
            {timed ? <li>{t('assessment.onStartDeadline')}</li> : null}
            <li>{t('assessment.onStartSaving')}</li>
          </ul>
        </div>
      ) : null}

      {dialog}
    </section>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0 @lg:flex-col @lg:justify-start @lg:gap-0.5 @lg:py-0">
      <dt className="shrink-0 text-sm text-ink-muted">{label}</dt>
      <dd className="text-right text-title-3 text-ink tabular-nums @lg:text-left">{children}</dd>
    </div>
  )
}
