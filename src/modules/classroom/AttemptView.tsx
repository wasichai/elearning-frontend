import { ApiError, LoadingState } from '@wasichai/core'
import { Alert, Button, ConfirmDialog } from '@wasichai/ui'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProblemState } from '../../shared/ProblemState'
import { formatTime } from '../../shared/format'
import { useAttempt, useSaveAnswers, useSubmitAttempt, useUploadSubmission, type AnswerInput } from './api'
import { AttemptResultView } from './AttemptResult'
import type { Attempt } from './contract'
import { Countdown, useNow } from './Countdown'
import { useProblemText, WRAP } from './parts'
import { emptyAnswer, isAnswered, QuestionField } from './Questions'

interface AttemptViewProps {
  enrollmentId: string
  attemptId: string
  passingPercent: number
  // la zona de la edición, para escribir el plazo
  timeZone: string
}

// un intento: abierto, se responde; enviado, se ve su resultado
export function AttemptView({ enrollmentId, attemptId, passingPercent, timeZone }: AttemptViewProps) {
  const { t } = useTranslation('classroom')
  const query = useAttempt(attemptId)
  if (query.isError) return <AttemptLoadProblem error={query.error} onRetry={() => void query.refetch()} />
  if (!query.data) return <LoadingState label={t('attempt.loading')} />
  if (query.data.status === 'OPEN') return <AttemptForm key={query.data.id} enrollmentId={enrollmentId} attempt={query.data} timeZone={timeZone} />
  return <AttemptResultView attempt={query.data} passingPercent={passingPercent} />
}

function AttemptLoadProblem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('classroom')
  const { kind, title, description } = useProblemText(error, 'attempt')
  if (kind === 'notFound') return <Alert tone="notice">{t('attempt.notFound')}</Alert>
  return (
    <ProblemState title={title} description={description}>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {t('problem.retry')}
      </Button>
    </ProblemState>
  )
}

function draftOf(attempt: Attempt): Record<string, AnswerInput> {
  return Object.fromEntries(
    attempt.questions.map((question) => {
      const saved = attempt.answers.find((answer) => answer.questionId === question.id)
      const answer: AnswerInput = saved
        ? { questionId: question.id, optionIds: saved.optionIds, text: saved.text, submissionId: saved.submissionId }
        : emptyAnswer(question.id)
      return [question.id, answer]
    })
  )
}

function AttemptForm({ enrollmentId, attempt, timeZone }: { enrollmentId: string; attempt: Attempt; timeZone: string }) {
  const { t, i18n } = useTranslation('classroom')
  // el borrador es de la persona: lo que el servidor devuelve al guardar no lo pisa
  const [draft, setDraft] = useState(() => draftOf(attempt))
  // el borrador al día, para quien termina más tarde: una subida larga no puede pisar lo que se escribió mientras tanto
  const latestDraft = useRef(draft)
  const changeAnswer = (questionId: string, change: (answer: AnswerInput) => AnswerInput) => {
    latestDraft.current = { ...latestDraft.current, [questionId]: change(latestDraft.current[questionId] ?? emptyAnswer(questionId)) }
    setDraft(latestDraft.current)
  }
  // cuántas subidas siguen en curso (cada pregunta de archivo lleva la suya): mientras haya alguna no se guarda ni se envía
  const [uploading, setUploading] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [savedAt, setSavedAt] = useState<number>()
  const save = useSaveAnswers(enrollmentId, attempt.id)
  const submit = useSubmitAttempt(enrollmentId, attempt.id)
  const upload = useUploadSubmission(attempt.id)
  const now = useNow(attempt.deadline !== null)
  const questions = [...attempt.questions].sort((a, b) => a.order - b.order)
  const answers = () => questions.map((question) => draft[question.id] ?? emptyAnswer(question.id))
  const answered = questions.filter((question) => isAnswered(draft[question.id])).length
  const expired = attempt.deadline !== null && Date.parse(attempt.deadline) <= now
  const busy = save.isPending || submit.isPending || uploading > 0
  const error = submit.error ?? save.error
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])

  const saveNow = (next = answers()) => save.mutate(next, { onSuccess: () => setSavedAt(Date.now()) })

  // subir el archivo y guardar enseguida la respuesta con su entrega: devuelve el error para la pregunta, si lo hubo
  const uploadFor = (questionId: string) => async (file: File) => {
    setUploading((count) => count + 1)
    try {
      const created = await upload.mutateAsync({ questionId, file })
      changeAnswer(questionId, (answer) => ({ ...answer, submissionId: created.id }))
      saveNow(questions.map((question) => latestDraft.current[question.id] ?? emptyAnswer(question.id)))
      return undefined
    } catch (cause) {
      return cause instanceof ApiError ? t('question.uploadFailedStatus', { status: cause.status }) : t('question.uploadFailed')
    } finally {
      setUploading((count) => count - 1)
    }
  }

  return (
    <section aria-labelledby={`attempt-${attempt.id}`} className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h3 id={`attempt-${attempt.id}`} ref={heading} tabIndex={-1} className="text-xl font-semibold text-ink focus:outline-none">
            {t('attempt.title', { number: attempt.number })}
          </h3>
          <p className="text-sm text-ink-muted">{t('attempt.answered', { answered, total: questions.length })}</p>
        </div>
        {attempt.deadline ? (
          <Countdown deadline={attempt.deadline} timeZone={timeZone} now={now} />
        ) : (
          <p className="text-sm text-ink-muted">{t('attempt.noLimit')}</p>
        )}
      </header>

      {expired ? <Alert tone="warning">{t('attempt.expiredLocal')}</Alert> : null}
      {error ? <AttemptActionProblem error={error} deadline={attempt.deadline} /> : null}

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          // Intro en una respuesta corta también envía el formulario: el botón desactivado no basta
          if (!busy) setConfirming(true)
        }}
      >
        {questions.map((question) => (
          <QuestionField
            key={question.id}
            question={question}
            answer={draft[question.id] ?? emptyAnswer(question.id)}
            saved={attempt.answers.find((answer) => answer.questionId === question.id)}
            disabled={submit.isPending}
            onChange={(answer) => changeAnswer(question.id, () => answer)}
            onUpload={uploadFor(question.id)}
          />
        ))}
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button type="button" variant="secondary" className={WRAP} disabled={busy} onClick={() => saveNow()}>
            {save.isPending ? t('attempt.saving') : t('attempt.save')}
          </Button>
          <Button type="submit" className={WRAP} disabled={busy}>
            {submit.isPending ? t('attempt.submitting') : t('attempt.submit')}
          </Button>
          <p role="status" className="text-sm text-ink-muted">
            {savedAt && !save.isPending && !save.isError ? t('attempt.saved', { time: formatTime(savedAt, i18n.language, timeZone) }) : ''}
          </p>
        </div>
      </form>

      {confirming ? (
        <ConfirmDialog
          variant="primary"
          title={t('attempt.confirmTitle')}
          description={
            answered < questions.length
              ? t('attempt.confirmUnanswered', { count: questions.length - answered, answered, total: questions.length })
              : t('attempt.confirmAll')
          }
          confirmLabel={t('attempt.confirmSubmit')}
          cancelLabel={t('attempt.confirmCancel')}
          busy={submit.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false)
            submit.mutate(answers())
          }}
        />
      ) : null}
    </section>
  )
}

// un fallo al guardar, subir o enviar. el servidor manda: un 409 es una regla suya (plazo vencido, intento ya enviado,
// intentos agotados, matrícula no activa) y se explica con lo que diga su detalle
export function AttemptActionProblem({ error, deadline }: { error: unknown; deadline?: string | null }) {
  const { t } = useTranslation('classroom')
  if (error instanceof ApiError && error.status === 409) {
    const late = deadline != null && Date.parse(deadline) <= Date.now()
    return (
      <Alert tone="warning" title={late ? t('attempt.expired') : t('attempt.conflict')}>
        {error.message ? t('attempt.serverSays', { detail: error.message }) : null}
      </Alert>
    )
  }
  if (error instanceof ApiError && error.status === 400) return <Alert tone="danger">{t('attempt.invalid')}</Alert>
  return <Alert tone="danger">{error instanceof ApiError ? t('attempt.failedStatus', { status: error.status }) : t('attempt.failed')}</Alert>
}
