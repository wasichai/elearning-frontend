import { ApiError, ReasonDialog, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button, Input, Label, Textarea } from '@wasichai/ui'
import { Check } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { TEXT_LINK, WRAP } from '../../shared/buttons'
import { formatNumber } from '../../shared/format'
import { Notice } from '../../shared/Notice'
import { Skeleton } from '../../shared/Screen'
import type { Answer, Attempt, FileRef, Question, QuestionResult } from '../../shared/attempts'
import { useDownload } from '../../shared/files'
import { ReturnFocus } from '../../shared/ReturnFocus'
import { useGrade, useQueue, useTeachingAttempt } from './api'
import { draftOf, isDirty, projectedScore, queuePosition, rubricPoints, validPoints, type Draft, type QueuePosition } from './grading'
import { OfferingFrame, QueryProblem, STICKY_BAR, submitterOf, useActionError, useLeaveDialog } from './parts'
import { TEACHING_ROUTES } from './routes'

const isManual = (question: Question) => question.type === 'OPEN' || question.type === 'FILE'

// corregir un intento: cada pregunta con su respuesta a un lado y su rúbrica al otro, y abajo, siempre a la vista, el total y el paso
// a la siguiente entrega. se califican a mano las abiertas y las de archivo; las automáticas ya llegan con su nota y aquí solo se leen
export function AttemptGradingPage() {
  const { t } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const { code = '', attemptId = '' } = useParams()
  const query = useTeachingAttempt(attemptId)
  const queue = useQueue(code).data
  // de quién es lo dice la cola; al corregirlo sale de ella, y quien corrige sigue viendo su nombre
  const queued = queue?.find((candidate) => candidate.attemptId === attemptId)
  const known = useRef(queued)
  known.current = queued ?? (known.current?.attemptId === attemptId ? known.current : undefined)
  const student = known.current
  const place = queue ? queuePosition(queue, attemptId) : undefined
  const [dirty, setDirty] = useState(false)
  const leave = useLeaveDialog(dirty)
  const attemptLink = (id: string) => links.to(TEACHING_ROUTES.attempt, { code, attemptId: id })
  const back = links.to(TEACHING_ROUTES.queue, { code })
  return (
    <OfferingFrame code={code} subtitle={student?.lessonTitle ?? t('grading.title')} back={back} backLabel={t('grading.back')}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        {/* el correo va aquí y no en la cabecera: es una palabra larga que la ensancharía en el móvil */}
        {student ? (
          <p className="min-w-0 text-sm text-ink-muted [overflow-wrap:anywhere]">
            {t('grading.student', { student: submitterOf(student) ?? t('roster.noEmail') })}
          </p>
        ) : (
          <span />
        )}
        {place?.position ? (
          <nav aria-label={t('grading.positionLabel')} className="flex flex-wrap items-center gap-x-4 text-sm">
            <span className="font-medium text-ink tabular-nums">{t('grading.position', { position: place.position, total: place.total })}</span>
            {place.previous ? (
              <Link to={attemptLink(place.previous)} className={TEXT_LINK}>
                {t('grading.previous')}
              </Link>
            ) : null}
            {place.next ? (
              <Link to={attemptLink(place.next)} className={TEXT_LINK}>
                {t('grading.next')}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
      {query.isError ? (
        <QueryProblem error={query.error} resource="attempt" onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <AttemptSkeleton />
      ) : (
        // otra entrega, otros borradores: lo escrito en una no pasa a la siguiente
        <AttemptGrading key={query.data.id} code={code} attempt={query.data} place={place} onDirty={setDirty} />
      )}
      {leave.dialog}
    </OfferingFrame>
  )
}

function AttemptSkeleton() {
  const { t } = useTranslation('teaching')
  return (
    <div role="status" className="grid grid-cols-1 gap-8 xl:grid-cols-2">
      <span className="sr-only">{t('grading.loading')}</span>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-3/5" />
        <Skeleton className="h-40 w-full" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-[72px] w-full" />
        <Skeleton className="h-[72px] w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

interface Asking {
  ids: string[]
  after?: () => void
}

function AttemptGrading({ code, attempt, place, onDirty }: { code: string; attempt: Attempt; place?: QueuePosition; onDirty: (dirty: boolean) => void }) {
  const { t } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const navigate = useNavigate()
  const describe = useActionError()
  const base = useId()
  const grade = useGrade(code, attempt.id)
  const { result } = attempt
  const questions = [...attempt.questions].sort((a, b) => a.order - b.order)
  const outcomeOf = (questionId: string) => result?.questions.find((outcome) => outcome.questionId === questionId)
  // solo lo que se ha tocado: lo demás se lee de lo que manda el servidor, así una relectura no pisa lo escrito
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [chosen, setChosen] = useState<Record<string, number[]>>({})
  const [invalid, setInvalid] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, unknown>>({})
  const [saved, setSaved] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState<Asking>()
  const [batchFailed, setBatchFailed] = useState(false)
  const [finished, setFinished] = useState(false)

  const gradable = questions.filter((question) => isManual(question) && outcomeOf(question.id))
  const draftFor = (id: string) => drafts[id] ?? draftOf(outcomeOf(id)!)
  const changed = (id: string) => isDirty(draftFor(id), outcomeOf(id)!)
  const dirty = gradable.some((question) => changed(question.id))
  useEffect(() => {
    onDirty(dirty)
    return () => onDirty(false)
  }, [dirty, onDirty])

  const pointsId = (id: string) => `${base}-${id}-points`
  const maxOf = (id: string) => outcomeOf(id)!.maxPoints

  const edit = (id: string, patch: Partial<Draft>) => {
    setDrafts((current) => ({ ...current, [id]: { ...draftFor(id), ...patch } }))
    setInvalid((current) => current.filter((candidate) => candidate !== id))
    setSaved((current) => current.filter((candidate) => candidate !== id))
    setErrors({})
    setBatchFailed(false)
    setFinished(false)
  }

  const run = async (ids: string[], reason: string | null, after?: () => void) => {
    setBusy(true)
    for (const id of ids) {
      const draft = draftFor(id)
      // el motivo solo acompaña a un cambio: una primera nota no lo lleva
      const input = {
        questionId: id,
        points: Number(draft.points),
        comment: draft.comment.trim() || null,
        reason: outcomeOf(id)!.points === null ? null : reason
      }
      try {
        await grade.mutateAsync(input)
        setDrafts(({ [id]: _done, ...rest }) => rest)
        setSaved((current) => [...current, id])
      } catch (error) {
        // se para aquí: lo que falta sigue escrito y se puede reintentar
        setErrors({ [id]: error })
        setBusy(false)
        return false
      }
    }
    setBusy(false)
    setAsking(undefined)
    after?.()
    return true
  }

  const request = (ids: string[], after?: () => void) => {
    const bad = ids.filter((id) => !validPoints(draftFor(id).points, maxOf(id)))
    setInvalid(bad)
    if (bad[0]) {
      document.getElementById(pointsId(bad[0]))?.focus()
      return
    }
    setErrors({})
    setSaved([])
    setBatchFailed(false)
    // cambiar una nota ya puesta exige motivo y queda en el historial: se pide con el diálogo de core
    if (ids.some((id) => outcomeOf(id)!.points !== null)) setAsking({ ids, after })
    else void run(ids, null, after).then((done) => setBatchFailed(!done && ids.length > 0 && after !== undefined))
  }

  // lo que hay que dejar calificado antes de pasar: lo cambiado y lo que aún no tiene nota
  const advance = () => {
    const ids = gradable.map((question) => question.id).filter((id) => changed(id) || outcomeOf(id)!.points === null)
    const after = () => {
      if (place?.next) void navigate(links.to(TEACHING_ROUTES.attempt, { code, attemptId: place.next }))
      else setFinished(true)
    }
    if (ids.length === 0) after()
    else request(ids, after)
  }

  const askingError = asking ? Object.values(errors)[0] : undefined
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-title-3 text-ink">{t('grading.attempt', { number: attempt.number })}</h2>
      {!result ? <Alert tone="notice">{t('grading.open')}</Alert> : null}
      {/* lo enfocado no queda tapado por el total fijo */}
      <ol className="flex flex-col gap-4 [&_button]:scroll-mb-48 [&_input]:scroll-mb-48 [&_textarea]:scroll-mb-48">
        {questions.map((question) => {
          const outcome = outcomeOf(question.id)
          return (
            <li key={question.id}>
              <QuestionReview question={question} answer={attempt.answers.find((answer) => answer.questionId === question.id)} outcome={outcome}>
                {(heading) =>
                  isManual(question) && outcome ? (
                    <GradeForm
                      question={question}
                      outcome={outcome}
                      heading={heading}
                      pointsId={pointsId(question.id)}
                      draft={draftFor(question.id)}
                      chosen={chosen[question.id] ?? []}
                      invalid={invalid.includes(question.id)}
                      error={asking ? undefined : errors[question.id]}
                      saved={saved.includes(question.id)}
                      busy={busy}
                      unchanged={outcome.points !== null && !changed(question.id)}
                      onEdit={(patch) => edit(question.id, patch)}
                      onChoose={(next) => {
                        setChosen((current) => ({ ...current, [question.id]: next }))
                        edit(question.id, { points: rubricPoints(question.rubric, next) })
                      }}
                      onSave={() => request([question.id])}
                    />
                  ) : null
                }
              </QuestionReview>
            </li>
          )
        })}
      </ol>
      {result ? (
        <TotalBar
          result={result}
          projected={projectedScore(result, drafts)}
          hasNext={place?.next !== undefined}
          queueKnown={place !== undefined}
          busy={busy}
          failed={batchFailed}
          finished={finished}
          queue={links.to(TEACHING_ROUTES.queue, { code })}
          onAdvance={advance}
        />
      ) : null}
      {asking ? (
        <ReturnFocus>
          <ReasonDialog
            title={t('grading.reasonTitle')}
            description={t('grading.reasonDescription')}
            confirmLabel={t('grading.reasonConfirm')}
            busy={busy}
            error={askingError ? describe(askingError) : null}
            onCancel={() => {
              setErrors({})
              setAsking(undefined)
            }}
            onConfirm={(reason) => void run(asking.ids, reason, asking.after)}
          />
        </ReturnFocus>
      ) : null}
    </div>
  )
}

function TotalBar({
  result,
  projected,
  hasNext,
  queueKnown,
  busy,
  failed,
  finished,
  queue,
  onAdvance
}: {
  result: NonNullable<Attempt['result']>
  projected?: number
  hasNext: boolean
  queueKnown: boolean
  busy: boolean
  failed: boolean
  finished: boolean
  queue: string
  onAdvance: () => void
}) {
  const { t, i18n } = useTranslation('teaching')
  const locale = i18n.language
  const score = formatNumber(result.score, locale)
  const max = formatNumber(result.maxScore, locale)
  return (
    <div className={STICKY_BAR}>
      {failed ? <Notice tone="danger">{t('grading.saveFailed')}</Notice> : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col">
          <p role="status" className="text-sm font-semibold text-ink tabular-nums">
            {result.pending || result.percent === null
              ? t('grading.pending', { score, max })
              : t(result.passed ? 'grading.passed' : 'grading.failed', { percent: formatNumber(result.percent, locale), score, max })}
          </p>
          {projected !== undefined ? (
            <p className="text-sm text-ink-muted tabular-nums">{t('grading.projected', { score: formatNumber(projected, locale), max })}</p>
          ) : null}
        </div>
        {finished ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p role="status" className="text-sm font-medium text-ink">
              {t(queueKnown ? 'grading.finished' : 'grading.finishedSaved')}
            </p>
            <Button asChild className={`${WRAP} min-h-11 shrink-0 px-5`}>
              <Link to={queue}>{t('grading.toQueue')}</Link>
            </Button>
          </div>
        ) : (
          <Button className={`${WRAP} min-h-11 shrink-0 px-5`} disabled={busy} onClick={onAdvance}>
            {busy ? t('grading.saving') : t(hasNext ? 'grading.saveNext' : 'grading.saveFinish')}
          </Button>
        )}
      </div>
    </div>
  )
}

function QuestionReview({
  question,
  answer,
  outcome,
  children
}: {
  question: Question
  answer?: Answer
  outcome?: QuestionResult
  children: (heading: string) => ReactNode
}) {
  const { t, i18n } = useTranslation('teaching')
  const locale = i18n.language
  const heading = t('grading.prompt', { order: question.order, prompt: question.prompt })
  const optionText = (ids: string[]) =>
    ids
      .map((id) => question.options.find((option) => option.id === id)?.text)
      .filter((text): text is string => text !== undefined)
      .join(', ')
  const given = answer && answer.optionIds.length > 0 ? optionText(answer.optionIds) : answer?.text?.trim()
  const file = answer?.submission?.file
  const form = children(heading)
  return (
    <article
      aria-label={heading}
      className={`grid grid-cols-1 gap-5 rounded-card border border-border bg-surface p-4 text-sm sm:p-5 ${form ? 'xl:grid-cols-2 xl:gap-8' : ''}`}
    >
      <div className="flex min-w-0 flex-col gap-3">
        <h3 className="text-base font-medium text-ink">{heading}</h3>
        {question.type === 'FILE' ? (
          file ? (
            <SubmissionDownload file={file} />
          ) : (
            <p className="text-ink-muted">{t('grading.noFile')}</p>
          )
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-ink-muted">{t('grading.answer')}</p>
            {given ? (
              <p className="font-read text-read-body-sm break-words whitespace-pre-wrap text-ink">{given}</p>
            ) : (
              <p className="text-ink">{t('grading.noAnswer')}</p>
            )}
          </div>
        )}
        {outcome?.solution ? (
          <div className="rounded-md bg-brand-soft px-3 py-2 text-ink">
            {outcome.solution.optionIds.length > 0 ? <p>{t('grading.solution', { answer: optionText(outcome.solution.optionIds) })}</p> : null}
            {outcome.solution.acceptedAnswers.length > 0 ? <p>{t('grading.accepted', { answers: outcome.solution.acceptedAnswers.join(', ') })}</p> : null}
          </div>
        ) : null}
        {form ? null : !outcome && question.rubric.length > 0 ? (
          <ul className="list-disc pl-5 text-ink-muted">
            {question.rubric.map((criterion) => (
              <li key={criterion.description}>
                {t('grading.criterion', { description: criterion.description, points: formatNumber(criterion.points, locale) })}
              </li>
            ))}
          </ul>
        ) : null}
        {form ? null : (
          <p className="font-medium text-ink">
            {outcome?.points == null
              ? t('grading.questionPending')
              : t('grading.questionPoints', { points: formatNumber(outcome.points, locale), max: formatNumber(outcome.maxPoints, locale) })}
          </p>
        )}
      </div>
      {form ? <div className="min-w-0 xl:border-l xl:border-border xl:pl-8">{form}</div> : null}
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
        className={`${WRAP} min-h-11`}
        variant="secondary"
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

// el contrato no da niveles por criterio ni guarda lo elegido: cada criterio es una celda que suma sus puntos a la nota, y lo que manda
// son los puntos del campo, que se pueden escribir a mano. por eso la pantalla dice que solo se guardan la nota y el comentario
function RubricCells({ question, chosen, onChoose }: { question: Question; chosen: number[]; onChoose: (next: number[]) => void }) {
  const { t, i18n } = useTranslation('teaching')
  return (
    <div className="@container flex w-full flex-col gap-2">
      <p className="font-medium text-ink">{t('grading.rubric')}</p>
      <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
        {question.rubric.map((criterion, index) => {
          const pressed = chosen.includes(index)
          return (
            <button
              key={`${criterion.description}-${index}`}
              type="button"
              aria-pressed={pressed}
              onClick={() => onChoose(pressed ? chosen.filter((candidate) => candidate !== index) : [...chosen, index])}
              className={`flex min-h-[72px] flex-col justify-center gap-1 rounded-md border p-3 text-left text-sm text-ink transition-colors duration-[160ms] motion-reduce:transition-none ${
                pressed ? 'border-2 border-brand bg-brand-soft' : 'border-border-control bg-surface hover:bg-surface-muted'
              }`}
            >
              <span>{t('grading.criterion', { description: criterion.description, points: formatNumber(criterion.points, i18n.language) })}</span>
              {pressed ? (
                <span aria-hidden="true" className="flex items-center gap-1 text-xs font-medium text-brand-strong">
                  <Check className="size-3.5 shrink-0" />
                  {t('grading.chosen')}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-ink-muted">{t('grading.rubricHint')}</p>
    </div>
  )
}

function GradeForm({
  question,
  outcome,
  heading,
  pointsId,
  draft,
  chosen,
  invalid,
  error,
  saved,
  busy,
  unchanged,
  onEdit,
  onChoose,
  onSave
}: {
  question: Question
  outcome: QuestionResult
  heading: string
  pointsId: string
  draft: Draft
  chosen: number[]
  invalid: boolean
  error: unknown
  saved: boolean
  busy: boolean
  unchanged: boolean
  onEdit: (patch: Partial<Draft>) => void
  onChoose: (next: number[]) => void
  onSave: () => void
}) {
  const { t, i18n } = useTranslation('teaching')
  const id = useId()
  const describe = useActionError()
  const graded = outcome.points !== null
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSave()
  }
  const max = formatNumber(outcome.maxPoints, i18n.language)
  // un 409 con una primera nota: otra persona ya la había puesto; el intento se relee y ahora se pide el motivo
  const raced = error instanceof ApiError && error.status === 409 ? error : null
  return (
    <form noValidate aria-label={t('grading.formLabel', { question: heading })} onSubmit={submit} className="flex flex-col items-start gap-3">
      {question.rubric.length > 0 ? <RubricCells question={question} chosen={chosen} onChoose={onChoose} /> : null}
      <div className="flex max-w-40 flex-col gap-1.5">
        <Label htmlFor={pointsId}>{t('grading.points', { max })}</Label>
        <Input
          id={pointsId}
          type="number"
          min={0}
          max={outcome.maxPoints}
          step="any"
          value={draft.points}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={invalid ? `${id}-invalid` : undefined}
          onChange={(event) => onEdit({ points: event.target.value })}
          className="min-h-11"
        />
      </div>
      {invalid ? (
        <p id={`${id}-invalid`} role="alert" className="text-danger">
          {t('grading.pointsInvalid', { max })}
        </p>
      ) : null}
      <div className="flex w-full flex-col gap-1.5">
        <Label htmlFor={`${id}-comment`}>{t('grading.comment')}</Label>
        <Textarea id={`${id}-comment`} rows={3} value={draft.comment} onChange={(event) => onEdit({ comment: event.target.value })} />
      </div>
      {raced ? <Alert tone="warning">{t('grading.reasonNeeded', { detail: raced.message })}</Alert> : null}
      {error && !raced ? <Alert tone="danger">{describe(error)}</Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button className={`${WRAP} min-h-11`} type="submit" variant="secondary" disabled={busy || unchanged}>
          {busy ? t('grading.saving') : graded ? t('grading.change') : t('grading.save')}
        </Button>
        <p role="status" className="text-success">
          {saved ? t('grading.saved') : ''}
        </p>
      </div>
    </form>
  )
}
