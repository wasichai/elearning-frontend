import { ApiError, LoadingState, ReasonDialog, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button, Input, Label, Textarea } from '@wasichai/ui'
import { useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { WRAP } from '../../shared/buttons'
import { useParams } from 'react-router'
import type { Answer, Attempt, FileRef, Question, QuestionResult } from '../../shared/attempts'
import { useDownload } from '../../shared/files'
import { formatNumber } from '../../shared/format'
import { useGrade, useQueue, useTeachingAttempt, type GradeInput } from './api'
import { OfferingFrame, QueryProblem, useActionError } from './parts'
import { TEACHING_ROUTES } from './routes'

// corregir un intento: cada pregunta con su respuesta, su entrega, la solución y la rúbrica. se califican a mano las
// preguntas abiertas y de archivo; las automáticas ya llegan con su nota y aquí solo se leen
export function AttemptGradingPage() {
  const { t } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const { code = '', attemptId = '' } = useParams()
  const query = useTeachingAttempt(attemptId)
  // de quién es lo dice la cola; al corregirlo sale de ella, y quien corrige sigue viendo su nombre
  const queued = useQueue(code).data?.find((candidate) => candidate.attemptId === attemptId)
  const known = useRef(queued)
  known.current = queued ?? known.current
  const student = known.current
  return (
    <OfferingFrame
      code={code}
      subtitle={student?.lessonTitle ?? t('grading.title')}
      back={links.to(TEACHING_ROUTES.queue, { code })}
      backLabel={t('grading.back')}
    >
      {/* el correo va aquí y no en la cabecera de core: es una palabra larga que la ensancharía en el móvil */}
      {student ? <p className="text-sm break-all text-ink-muted">{t('grading.student', { student: student.email ?? t('roster.noEmail') })}</p> : null}
      {query.isError ? (
        <QueryProblem error={query.error} resource="attempt" onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <LoadingState label={t('grading.loading')} />
      ) : (
        <AttemptGrading code={code} attempt={query.data} />
      )}
    </OfferingFrame>
  )
}

function AttemptGrading({ code, attempt }: { code: string; attempt: Attempt }) {
  const { t, i18n } = useTranslation('teaching')
  const locale = i18n.language
  const { result } = attempt
  const questions = [...attempt.questions].sort((a, b) => a.order - b.order)
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold text-ink">{t('grading.attempt', { number: attempt.number })}</h2>
      {!result ? (
        <Alert tone="notice">{t('grading.open')}</Alert>
      ) : (
        <div role="status" className="rounded-card border border-border bg-surface-muted px-5 py-4 text-sm">
          <p className="text-base font-semibold text-ink">
            {result.pending || result.percent === null
              ? t('grading.pending', { score: formatNumber(result.score, locale), max: formatNumber(result.maxScore, locale) })
              : t(result.passed ? 'grading.passed' : 'grading.failed', {
                  percent: formatNumber(result.percent, locale),
                  score: formatNumber(result.score, locale),
                  max: formatNumber(result.maxScore, locale)
                })}
          </p>
        </div>
      )}
      <ol className="flex flex-col gap-4">
        {questions.map((question) => (
          <li key={question.id}>
            <QuestionReview
              code={code}
              attemptId={attempt.id}
              question={question}
              answer={attempt.answers.find((answer) => answer.questionId === question.id)}
              outcome={result?.questions.find((outcome) => outcome.questionId === question.id)}
            />
          </li>
        ))}
      </ol>
    </div>
  )
}

interface QuestionReviewProps {
  code: string
  attemptId: string
  question: Question
  answer?: Answer
  outcome?: QuestionResult
}

function QuestionReview({ code, attemptId, question, answer, outcome }: QuestionReviewProps) {
  const { t, i18n } = useTranslation('teaching')
  const locale = i18n.language
  const heading = t('grading.prompt', { order: question.order, prompt: question.prompt })
  const optionText = (ids: string[]) =>
    ids
      .map((id) => question.options.find((option) => option.id === id)?.text)
      .filter((text): text is string => text !== undefined)
      .join(', ')
  const manual = question.type === 'OPEN' || question.type === 'FILE'
  const given = answer && answer.optionIds.length > 0 ? optionText(answer.optionIds) : answer?.text?.trim()
  const file = answer?.submission?.file
  return (
    <article aria-label={heading} className="flex flex-col gap-3 rounded-card border border-border px-5 py-4 text-sm">
      <h3 className="text-base font-medium text-ink">{heading}</h3>
      {question.type === 'FILE' ? (
        file ? (
          <SubmissionDownload file={file} />
        ) : (
          <p className="text-ink-muted">{t('grading.noFile')}</p>
        )
      ) : (
        <p className="whitespace-pre-wrap text-ink">
          <span className="text-ink-muted">{t('grading.answer')} </span>
          {given || t('grading.noAnswer')}
        </p>
      )}
      {outcome?.solution ? (
        <div className="rounded-md bg-brand-soft px-3 py-2 text-ink">
          {outcome.solution.optionIds.length > 0 ? <p>{t('grading.solution', { answer: optionText(outcome.solution.optionIds) })}</p> : null}
          {outcome.solution.acceptedAnswers.length > 0 ? <p>{t('grading.accepted', { answers: outcome.solution.acceptedAnswers.join(' · ') })}</p> : null}
        </div>
      ) : null}
      {question.rubric.length > 0 ? (
        <div>
          <p className="font-medium text-ink">{t('grading.rubric')}</p>
          <ul className="list-disc pl-5 text-ink-muted">
            {question.rubric.map((criterion) => (
              <li key={criterion.description}>
                {t('grading.criterion', { description: criterion.description, points: formatNumber(criterion.points, locale) })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {manual && outcome ? (
        <GradeForm code={code} attemptId={attemptId} question={question} outcome={outcome} heading={heading} />
      ) : (
        <p className="font-medium text-ink">
          {outcome?.points == null
            ? t('grading.questionPending')
            : t('grading.questionPoints', { points: formatNumber(outcome.points, locale), max: formatNumber(outcome.maxPoints, locale) })}
        </p>
      )}
    </article>
  )
}

// la entrega se baja con la sesión, con la misma descarga segura que el material del aula
function SubmissionDownload({ file }: { file: FileRef }) {
  const { t } = useTranslation('teaching')
  const { download, pending, error } = useDownload(file)
  const describe = useActionError()
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        className={WRAP}
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => void download()}
        aria-label={t('grading.downloadLabel', { name: file.name })}
      >
        {pending ? t('grading.downloading') : t('grading.download')}
      </Button>
      <span aria-hidden="true" className="break-all text-ink-muted">
        {file.name}
      </span>
      {error ? <Alert tone="danger">{describe(error)}</Alert> : null}
    </div>
  )
}

function GradeForm({
  code,
  attemptId,
  question,
  outcome,
  heading
}: {
  code: string
  attemptId: string
  question: Question
  outcome: QuestionResult
  heading: string
}) {
  const { t, i18n } = useTranslation('teaching')
  const id = useId()
  const describe = useActionError()
  const grade = useGrade(code, attemptId)
  const [points, setPoints] = useState(outcome.points === null ? '' : String(outcome.points))
  const [comment, setComment] = useState(outcome.comment ?? '')
  const [invalid, setInvalid] = useState(false)
  const [asking, setAsking] = useState(false)
  const graded = outcome.points !== null
  const unchanged = graded && Number(points) === outcome.points && comment.trim() === (outcome.comment ?? '')
  const send = (reason: string | null, onSuccess?: () => void) => {
    const input: GradeInput = { questionId: question.id, points: Number(points), comment: comment.trim() || null, reason }
    grade.mutate(input, { onSuccess })
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = Number(points)
    const valid = points.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= outcome.maxPoints
    setInvalid(!valid)
    if (!valid) return
    grade.reset()
    // cambiar una nota ya puesta exige motivo y queda en el historial: se pide con el diálogo de core
    if (graded) setAsking(true)
    else send(null)
  }
  const max = formatNumber(outcome.maxPoints, i18n.language)
  // un 409 con una primera nota: otra persona ya la había puesto; el intento se relee y ahora se pide el motivo
  const raced = grade.error instanceof ApiError && grade.error.status === 409 && !asking ? grade.error : null
  return (
    <form
      noValidate
      aria-label={t('grading.formLabel', { question: heading })}
      onSubmit={submit}
      className="flex flex-col items-start gap-3 border-t border-border pt-3"
    >
      <div className="flex max-w-40 flex-col gap-1.5">
        <Label htmlFor={`${id}-points`}>{t('grading.points', { max })}</Label>
        <Input
          id={`${id}-points`}
          type="number"
          min={0}
          max={outcome.maxPoints}
          step="any"
          value={points}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={invalid ? `${id}-invalid` : undefined}
          onChange={(event) => setPoints(event.target.value)}
        />
      </div>
      {invalid ? (
        <p id={`${id}-invalid`} role="alert" className="text-danger">
          {t('grading.pointsInvalid', { max })}
        </p>
      ) : null}
      <div className="flex w-full flex-col gap-1.5">
        <Label htmlFor={`${id}-comment`}>{t('grading.comment')}</Label>
        <Textarea id={`${id}-comment`} rows={3} value={comment} onChange={(event) => setComment(event.target.value)} />
      </div>
      {raced ? <Alert tone="warning">{t('grading.reasonNeeded', { detail: raced.message })}</Alert> : null}
      {grade.error && !raced && !asking ? <Alert tone="danger">{describe(grade.error)}</Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button className={WRAP} type="submit" variant="secondary" size="sm" disabled={grade.isPending || unchanged}>
          {grade.isPending ? t('grading.saving') : graded ? t('grading.change') : t('grading.save')}
        </Button>
        <p role="status" className="text-success">
          {grade.isSuccess ? t('grading.saved') : ''}
        </p>
      </div>
      {asking ? (
        <ReasonDialog
          title={t('grading.reasonTitle')}
          description={t('grading.reasonDescription')}
          confirmLabel={t('grading.reasonConfirm')}
          busy={grade.isPending}
          error={grade.error ? describe(grade.error) : null}
          onCancel={() => {
            grade.reset()
            setAsking(false)
          }}
          onConfirm={(reason) => send(reason, () => setAsking(false))}
        />
      ) : null}
    </form>
  )
}
