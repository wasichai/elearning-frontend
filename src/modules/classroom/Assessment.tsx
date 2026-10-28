import { useWasichaiLinks } from '@wasichai/core'
import { Alert, Button } from '@wasichai/ui'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { formatNumber } from '../../shared/format'
import { useStartAttempt } from './api'
import { AttemptActionProblem, AttemptView } from './AttemptView'
import type { AssessmentSummary, Lesson } from './contract'
import { WRAP } from './parts'
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
    <div className="flex flex-col gap-4">
      <Link
        to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId }, { [LESSON_PARAM]: lesson.id })}
        className="self-start text-sm text-link underline-offset-4 hover:underline"
      >
        {t('assessment.back')}
      </Link>
      <AttemptView enrollmentId={enrollmentId} attemptId={attemptId} passingPercent={lesson.assessment.passingPercent} timeZone={timeZone} />
    </div>
  )
}

function AssessmentPanel({ enrollmentId, lesson }: { enrollmentId: string; lesson: AssessedLesson }) {
  const { t, i18n } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const navigate = useNavigate()
  const start = useStartAttempt(enrollmentId)
  const { assessment } = lesson
  const locale = i18n.language
  const exhausted = assessment.openAttemptId === null && assessment.attemptsUsed >= assessment.maxAttempts
  const attemptLink = (attemptId: string) => links.to(CLASSROOM_ROUTES.classroom, { enrollmentId }, { [LESSON_PARAM]: lesson.id, [ATTEMPT_PARAM]: attemptId })
  return (
    <section aria-labelledby={`assessment-${assessment.id}`} className="flex flex-col gap-4 rounded-card border border-border px-5 py-4">
      <h3 id={`assessment-${assessment.id}`} className="text-lg font-semibold text-ink">
        {assessment.title}
      </h3>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Fact label={t('assessment.attempts')}>
          {t('assessment.attemptsValue', { used: formatNumber(assessment.attemptsUsed, locale), max: formatNumber(assessment.maxAttempts, locale) })}
        </Fact>
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

      {start.error ? <AttemptActionProblem error={start.error} /> : null}

      {assessment.openAttemptId ? (
        <Button asChild className={`self-start ${WRAP}`}>
          <Link to={attemptLink(assessment.openAttemptId)}>{t('assessment.resume')}</Link>
        </Button>
      ) : exhausted ? (
        <Alert tone="notice">{t('assessment.exhausted', { count: assessment.maxAttempts })}</Alert>
      ) : (
        <div className="flex flex-col items-start gap-2">
          {assessment.timeLimitMinutes !== null ? (
            <p className="text-sm text-ink-muted">{t('assessment.timerStarts', { value: formatNumber(assessment.timeLimitMinutes, locale) })}</p>
          ) : null}
          <Button
            className={WRAP}
            disabled={start.isPending}
            onClick={() => start.mutate(lesson.id, { onSuccess: (attempt) => void navigate(attemptLink(attempt.id)) })}
          >
            {start.isPending ? t('assessment.starting') : assessment.attemptsUsed > 0 ? t('assessment.retry') : t('assessment.start')}
          </Button>
        </div>
      )}
    </section>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  )
}
