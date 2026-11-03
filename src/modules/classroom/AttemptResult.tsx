import { useApiClient, useWasichaiLinks } from '@wasichai/core'
import { useQuery } from '@tanstack/react-query'
import { CircleCheck, CircleMinus, CircleX } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { TEXT_LINK } from '../../shared/buttons'
import { formatDateTime, formatNumber } from '../../shared/format'
import { classroomQuery } from './api'
import type { Answer, Attempt, AttemptResult, Question, QuestionResult } from './contract'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'
import { StatusBadge } from './StatusBadge'

interface AttemptResultViewProps {
  enrollmentId: string
  attempt: Attempt
  passingPercent: number
  // el título de la evaluación y sus intentos, que el intento no trae: al llegar aquí, el título de la lección ya quedó arriba
  title: string
  maxAttempts: number
  // la zona de la edición, para escribir la fecha de entrega
  timeZone: string
  // salir o volver a intentar: las reglas son de la evaluación (Assessment.tsx)
  actions: ReactNode
}

// una nota nunca se lee más alta de lo que es: 69,999 no se escribe 70 (el servidor también trunca, «nadie aprueba por redondeo»)
function formatEarned(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2, roundingMode: 'trunc' }).format(value)
}

// el resultado de un intento enviado: la nota (o que espera corrección), cómo salir de aquí y, debajo, cada pregunta con sus puntos, el
// comentario del docente y, si la evaluación las muestra, las soluciones. lo primero queda arriba: el desglose puede ser largo
export function AttemptResultView({ enrollmentId, attempt, passingPercent, title, maxAttempts, timeZone, actions }: AttemptResultViewProps) {
  const { t, i18n } = useTranslation('classroom')
  const result = attempt.result
  const heading = useRef<HTMLHeadingElement>(null)
  // como al abrir un intento: arriba, debajo de la barra de la lección, y el foco en su título
  useEffect(() => {
    heading.current?.focus()
    heading.current?.closest('section')?.scrollIntoView?.({ block: 'start' })
  }, [])
  if (!result) return null
  const questions = [...attempt.questions].sort((a, b) => a.order - b.order)
  return (
    <section aria-labelledby={`result-${attempt.id}`} className="flex scroll-mt-18 flex-col gap-8">
      <div className="@container flex flex-col gap-5 rounded-card border border-border bg-surface px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-0.5 text-sm text-ink-muted">
          <p className="font-semibold text-ink">{title}</p>
          <div className="flex flex-col gap-0.5 @lg:flex-row @lg:items-baseline @lg:justify-between @lg:gap-4">
            <div className="flex flex-wrap items-baseline gap-x-1">
              <h3 id={`result-${attempt.id}`} ref={heading} tabIndex={-1} className="focus:outline-none">
                {t('result.title', { number: attempt.number })}
              </h3>
              <span>{t('attempt.ofMax', { max: maxAttempts })}</span>
            </div>
            {attempt.submittedAt ? <p>{t('result.submittedAt', { date: formatDateTime(attempt.submittedAt, i18n.language, timeZone) })}</p> : null}
          </div>
        </div>
        <ResultSummary result={result} passingPercent={passingPercent} />
        <div className="border-t border-border pt-4">{actions}</div>
      </div>
      {questions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h4 className="text-title-3 text-ink">{t('result.byQuestion')}</h4>
          <ol className="flex flex-col divide-y divide-border">
            {questions.map((question) => (
              <li key={question.id} className="py-5 first:pt-2 last:pb-0">
                <QuestionOutcome
                  question={question}
                  answer={attempt.answers.find((answer) => answer.questionId === question.id)}
                  outcome={result.questions.find((outcome) => outcome.questionId === question.id)}
                  enrollmentId={enrollmentId}
                />
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  )
}

function ResultSummary({ result, passingPercent }: { result: AttemptResult; passingPercent: number }) {
  const { t, i18n } = useTranslation('classroom')
  const locale = i18n.language
  const score = { score: formatEarned(result.score, locale), max: formatNumber(result.maxScore, locale) }
  if (result.pending || result.percent === null)
    return (
      <div role="status" className="flex items-center gap-4">
        <GradeRing label={t('result.noGrade')} percent={null}>
          <span className="block text-xs/4 font-medium text-ink-muted">{t('result.noGrade')}</span>
        </GradeRing>
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <StatusBadge state="review">{t('result.pending')}</StatusBadge>
          <p className="text-sm text-ink">{t('result.pendingHint', score)}</p>
          <p className="text-sm text-ink-muted">{t('result.pendingNext')}</p>
        </div>
      </div>
    )
  const grade = t('assessment.percent', { value: formatEarned(result.percent, locale) })
  const Icon = result.passed ? CircleCheck : CircleMinus
  return (
    <div role="status" className="flex items-center gap-4">
      <GradeRing label={t('result.grade', { value: grade })} percent={result.percent} tone={result.passed ? 'text-success' : 'text-warning'}>
        <span className={`block tabular-nums ${Number.isInteger(result.percent) ? 'text-title-2' : 'text-title-3'} text-ink`}>{grade}</span>
      </GradeRing>
      <div className="flex min-w-0 flex-col gap-1">
        <p className={`flex items-center gap-2 text-title-2 ${result.passed ? 'text-success' : 'text-warning'}`}>
          <Icon aria-hidden="true" className="size-6 shrink-0" />
          {t(result.passed ? 'result.passed' : 'result.failed')}
        </p>
        <p className="text-sm text-ink-muted">{t('result.score', { ...score, passing: formatNumber(passingPercent, locale) })}</p>
      </div>
    </div>
  )
}

const RING = { center: 60, radius: 53, stroke: 10 }
const CIRCUMFERENCE = 2 * Math.PI * RING.radius

// el anillo de la nota. nunca dice nada solo: el texto del centro y la palabra de al lado cuentan lo mismo. sin nota (percent null), un
// cordón punteado y sin arco: una nota a medias no se dibuja
function GradeRing({ label, percent, tone, children }: { label: string; percent: number | null; tone?: string; children: ReactNode }) {
  const circle = { cx: RING.center, cy: RING.center, r: RING.radius, fill: 'none', strokeWidth: RING.stroke }
  return (
    <div role="img" aria-label={label} className={`relative grid size-28 shrink-0 place-items-center text-center ${tone ?? ''}`}>
      <svg aria-hidden="true" viewBox="0 0 120 120" className="absolute inset-0 size-full -rotate-90">
        <circle {...circle} className="stroke-border" strokeDasharray={percent === null ? '3 9' : undefined} />
        {percent ? <circle {...circle} data-arc="" stroke="currentColor" strokeDasharray={`${(CIRCUMFERENCE * percent) / 100} ${CIRCUMFERENCE}`} /> : null}
      </svg>
      <div className="relative w-20">{children}</div>
    </div>
  )
}

const LONG_TEXT = 'min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]'

function QuestionOutcome({ question, answer, outcome, enrollmentId }: { question: Question; answer?: Answer; outcome?: QuestionResult; enrollmentId: string }) {
  const { t, i18n } = useTranslation('classroom')
  const locale = i18n.language
  const optionText = (ids: string[]) =>
    ids
      .map((id) => question.options.find((option) => option.id === id)?.text)
      .filter((text): text is string => text !== undefined)
      .join(', ')
  const given = answer ? answerText(question, answer, optionText, t('question.fileDeliveredUnnamed')) : ''
  const title = t('question.prompt', { order: question.order, prompt: question.prompt })
  return (
    <article aria-label={title} className="flex flex-col gap-3 text-sm">
      <h5 className={`font-read text-read-body-sm font-medium text-ink ${LONG_TEXT}`}>{title}</h5>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {outcome?.points == null ? (
          <>
            <StatusBadge state="review">{t('result.questionPending')}</StatusBadge>
            <span className="text-ink-muted">
              {t('result.questionWorth', { points: t('question.points', { count: question.points, value: formatNumber(question.points, locale) }) })}
            </span>
          </>
        ) : (
          <>
            {outcome.correct === null ? null : <Verdict correct={outcome.correct} />}
            <span className="font-medium text-ink tabular-nums">
              {t('result.questionPoints', {
                count: outcome.maxPoints,
                points: formatEarned(outcome.points, locale),
                max: formatNumber(outcome.maxPoints, locale)
              })}
            </span>
          </>
        )}
      </p>
      <p className="text-ink">
        <span className="text-ink-muted">{t('result.yourAnswer')} </span>
        {given ? <span className={`font-read text-base ${LONG_TEXT}`}>{given}</span> : <span className="text-ink-muted">{t('result.noAnswer')}</span>}
      </p>
      {outcome?.solution ? <Solution solution={outcome.solution} optionText={optionText} /> : null}
      {outcome?.comment ? (
        <div className="flex flex-col gap-0.5 border-l-2 border-border-control pl-3">
          <p className="text-ink-muted">{t('result.comment')}</p>
          <p className={`font-read text-base text-ink ${LONG_TEXT}`}>{outcome.comment}</p>
        </div>
      ) : null}
      {outcome?.reviewLessonId ? <ReviewLesson enrollmentId={enrollmentId} lessonId={outcome.reviewLessonId} /> : null}
    </article>
  )
}

// el resultado da el id de la lección de repaso; su título es el del temario del aula, ya en la caché del marco. una lección que el aula
// no trae no se enlaza: abrirla solo diría que no está
function ReviewLesson({ enrollmentId, lessonId }: { enrollmentId: string; lessonId: string }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const { data: classroom } = useQuery({ ...classroomQuery(useApiClient(), enrollmentId), refetchOnMount: false })
  const lesson = classroom?.units.flatMap((unit) => unit.lessons).find((candidate) => candidate.id === lessonId)
  if (!lesson) return null
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-ink">
      <span className="text-ink-muted">{t('result.review')}</span>
      <Link
        to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId }, { [LESSON_PARAM]: lesson.id })}
        className={`${TEXT_LINK} underline [overflow-wrap:anywhere]`}
      >
        {lesson.title}
      </Link>
    </p>
  )
}

// icono y palabra: el color nunca va solo. una respuesta mal no es un error de la página: sin rojo
function Verdict({ correct }: { correct: boolean }) {
  const { t } = useTranslation('classroom')
  const Icon = correct ? CircleCheck : CircleX
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${correct ? 'text-success' : 'text-warning'}`}>
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {t(`result.${correct ? 'correct' : 'incorrect'}`)}
    </span>
  )
}

function answerText(question: Question, answer: Answer, optionText: (ids: string[]) => string, delivered: string): string {
  if (question.type === 'FILE') return answer.submission?.file?.name ?? (answer.submissionId ? delivered : '')
  if (answer.optionIds.length > 0) return optionText(answer.optionIds)
  return answer.text?.trim() ?? ''
}

function Solution({ solution, optionText }: { solution: NonNullable<QuestionResult['solution']>; optionText: (ids: string[]) => string }) {
  const { t } = useTranslation('classroom')
  return (
    <div className={`text-ink ${LONG_TEXT}`}>
      {solution.optionIds.length > 0 ? <p>{t('result.solution', { answer: optionText(solution.optionIds) })}</p> : null}
      {solution.acceptedAnswers.length > 0 ? <p>{t('result.accepted', { answers: solution.acceptedAnswers.join(' · ') })}</p> : null}
    </div>
  )
}
