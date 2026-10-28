import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '../../shared/format'
import type { Answer, Attempt, AttemptResult, Question, QuestionResult } from './contract'

// el resultado de un intento enviado: la nota (o que espera corrección), y cada pregunta con sus puntos, el comentario
// del docente y, si la evaluación las muestra, las soluciones
export function AttemptResultView({ attempt, passingPercent }: { attempt: Attempt; passingPercent: number }) {
  const { t } = useTranslation('classroom')
  const result = attempt.result
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])
  if (!result) return null
  const questions = [...attempt.questions].sort((a, b) => a.order - b.order)
  return (
    <section aria-labelledby={`result-${attempt.id}`} className="flex flex-col gap-5">
      <h3 id={`result-${attempt.id}`} ref={heading} tabIndex={-1} className="text-xl font-semibold text-ink focus:outline-none">
        {t('result.title', { number: attempt.number })}
      </h3>
      <ResultSummary result={result} passingPercent={passingPercent} />
      <ol className="flex flex-col gap-4">
        {questions.map((question) => (
          <li key={question.id}>
            <QuestionOutcome
              question={question}
              answer={attempt.answers.find((answer) => answer.questionId === question.id)}
              outcome={result.questions.find((outcome) => outcome.questionId === question.id)}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}

function ResultSummary({ result, passingPercent }: { result: AttemptResult; passingPercent: number }) {
  const { t, i18n } = useTranslation('classroom')
  const locale = i18n.language
  const score = { score: formatNumber(result.score, locale), max: formatNumber(result.maxScore, locale) }
  if (result.pending || result.percent === null)
    return (
      <div role="status" className="flex flex-col gap-1 rounded-card border border-border bg-surface-muted px-5 py-4">
        <p className="text-base font-semibold text-ink">{t('result.pending')}</p>
        <p className="text-sm text-ink-muted">{t('result.pendingHint', score)}</p>
      </div>
    )
  return (
    <div role="status" className="flex flex-col gap-1 rounded-card border border-border bg-surface-muted px-5 py-4">
      <p className={`text-base font-semibold ${result.passed ? 'text-success' : 'text-danger'}`}>
        {t(result.passed ? 'result.passed' : 'result.failed', { percent: formatNumber(result.percent, locale) })}
      </p>
      <p className="text-sm text-ink-muted">{t('result.score', { ...score, passing: formatNumber(passingPercent, locale) })}</p>
    </div>
  )
}

function QuestionOutcome({ question, answer, outcome }: { question: Question; answer?: Answer; outcome?: QuestionResult }) {
  const { t, i18n } = useTranslation('classroom')
  const locale = i18n.language
  const optionText = (ids: string[]) =>
    ids
      .map((id) => question.options.find((option) => option.id === id)?.text)
      .filter((text): text is string => text !== undefined)
      .join(', ')
  const given = answer ? answerText(question, answer, optionText, t('question.fileDeliveredUnnamed')) : ''
  const verdict = outcome?.correct === true ? 'correct' : outcome?.correct === false ? 'incorrect' : undefined
  return (
    <article
      aria-label={t('question.prompt', { order: question.order, prompt: question.prompt })}
      className="flex flex-col gap-2 rounded-card border border-border px-5 py-4 text-sm"
    >
      <h4 className="text-base font-medium text-ink">{t('question.prompt', { order: question.order, prompt: question.prompt })}</h4>
      <p className="text-ink">
        <span className="text-ink-muted">{t('result.yourAnswer')} </span>
        {given || t('result.noAnswer')}
      </p>
      <p className="flex flex-wrap gap-x-3">
        <span className="font-medium text-ink">
          {outcome?.points == null
            ? t('result.questionPending')
            : t('result.questionPoints', { points: formatNumber(outcome.points, locale), max: formatNumber(outcome.maxPoints, locale) })}
        </span>
        {verdict ? <span className={verdict === 'correct' ? 'text-success' : 'text-danger'}>{t(`result.${verdict}`)}</span> : null}
      </p>
      {outcome?.comment ? (
        <p className="text-ink">
          <span className="text-ink-muted">{t('result.comment')} </span>
          {outcome.comment}
        </p>
      ) : null}
      {outcome?.solution ? <Solution solution={outcome.solution} optionText={optionText} /> : null}
    </article>
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
    <div className="rounded-md bg-brand-soft px-3 py-2 text-ink">
      {solution.optionIds.length > 0 ? <p>{t('result.solution', { answer: optionText(solution.optionIds) })}</p> : null}
      {solution.acceptedAnswers.length > 0 ? <p>{t('result.accepted', { answers: solution.acceptedAnswers.join(' · ') })}</p> : null}
    </div>
  )
}
