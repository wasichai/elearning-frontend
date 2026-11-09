import { ApiError } from '@wasichai/core'
import { Alert, Button, Dialog, DialogContent, DialogDescription, DialogTitle } from '@wasichai/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Notice } from '../../shared/Notice'
import { ProblemState } from '../../shared/ProblemState'
import { formatTime } from '../../shared/format'
import { ReturnFocus } from '../../shared/ReturnFocus'
import { useAttempt, useSaveAnswers, useSubmitAttempt, useUploadSubmission, type AnswerInput } from './api'
import { AttemptResultView } from './AttemptResult'
import type { Attempt } from './contract'
import { Countdown, DeadlineNote, useNow } from './Countdown'
import { useProblemText } from './parts'
import { emptyAnswer, isAnswered, QuestionField, QuestionIndex } from './Questions'
import { StateMark } from '../../shared/StateMark'
import { attemptMarks } from './lessons'
import { DocumentSkeleton } from '../../shared/PageSkeleton'
import { useElementHeight } from '../../shared/useElementHeight'

interface AttemptViewProps {
  enrollmentId: string
  attemptId: string
  passingPercent: number
  // el título de la evaluación y sus intentos, que el intento no trae
  title: string
  maxAttempts: number
  // la zona de la edición, para escribir el plazo
  timeZone: string
  // lo que se puede hacer al ver el resultado
  resultActions: ReactNode
}

// un intento: abierto, se responde; enviado, se ve su resultado
export function AttemptView({ enrollmentId, attemptId, passingPercent, title, maxAttempts, timeZone, resultActions }: AttemptViewProps) {
  const { t } = useTranslation('classroom')
  const query = useAttempt(attemptId)
  if (query.isError) return <AttemptLoadProblem error={query.error} onRetry={() => void query.refetch()} />
  if (!query.data) return <DocumentSkeleton label={t('attempt.loading')} />
  if (query.data.status === 'OPEN')
    return <AttemptForm key={query.data.id} enrollmentId={enrollmentId} attempt={query.data} title={title} maxAttempts={maxAttempts} timeZone={timeZone} />
  return (
    <AttemptResultView
      enrollmentId={enrollmentId}
      attempt={query.data}
      passingPercent={passingPercent}
      title={title}
      maxAttempts={maxAttempts}
      timeZone={timeZone}
      actions={resultActions}
    />
  )
}

function AttemptLoadProblem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('classroom')
  const { kind, title, description, technical } = useProblemText(error, 'attempt')
  if (kind === 'notFound') return <Alert tone="notice">{t('attempt.notFound')}</Alert>
  return (
    <ProblemState title={title} description={description} technical={technical}>
      <Button variant="secondary" onClick={onRetry}>
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

// sin conexión no hay nada que falle todavía: aquí no se guarda solo. se avisa enseguida, para que nadie confíe en lo que aún no llegó
function useOnline() {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener('online', notify)
      window.addEventListener('offline', notify)
      return () => {
        window.removeEventListener('online', notify)
        window.removeEventListener('offline', notify)
      }
    },
    () => navigator.onLine
  )
}

// la cabecera sigue a la vista debajo de la barra de la lección (--classroom-bar, que mide el aula), y crece con su aviso: lo que recibe el
// foco o se salta queda debajo
function useStickyOffset() {
  const { ref, height } = useElementHeight<HTMLElement>()
  return { ref, style: { '--attempt-top': `calc(var(--classroom-bar, 3.5rem) + ${height === undefined ? '6rem' : `${height}px`})` } as CSSProperties }
}

// la pregunta que se está viendo cuando se ven todas: la que cruza la franja alta de la pantalla. tras un salto se le deja llegar
function useCurrentOnScroll(onChange: (index: number) => void) {
  const elements = useRef<(HTMLElement | null)[]>([])
  const jumpedAt = useRef(0)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const seen = new Set<number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = elements.current.indexOf(entry.target as HTMLElement)
          if (entry.isIntersecting) seen.add(index)
          else seen.delete(index)
        }
        if (seen.size > 0 && performance.now() - jumpedAt.current > 500) onChange(Math.min(...seen))
      },
      { rootMargin: '-25% 0px -70% 0px' }
    )
    for (const element of elements.current) if (element) observer.observe(element)
    return () => observer.disconnect()
  }, [onChange])
  return {
    elements,
    markJump: () => {
      jumpedAt.current = performance.now()
    }
  }
}

// nada que reciba el foco o a lo que se salte queda bajo la cabecera fija
const CLEAR_HEADER = '[&_:is(a,button,fieldset,input,label,textarea)]:scroll-mt-[calc(var(--attempt-top)+0.75rem)]'

function AttemptForm({
  enrollmentId,
  attempt,
  title,
  maxAttempts,
  timeZone
}: {
  enrollmentId: string
  attempt: Attempt
  title: string
  maxAttempts: number
  timeZone: string
}) {
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
  const online = useOnline()
  const questions = [...attempt.questions].sort((a, b) => a.order - b.order)
  const answers = () => questions.map((question) => draft[question.id] ?? emptyAnswer(question.id))
  const answered = questions.filter((question) => isAnswered(draft[question.id])).length
  const blank = questions.map((question, index) => ({ question, index })).filter(({ question }) => !isAnswered(draft[question.id]))
  const expired = attempt.deadline !== null && Date.parse(attempt.deadline) <= now
  const busy = save.isPending || submit.isPending || uploading > 0
  const error = submit.error ?? save.error
  const heading = useRef<HTMLHeadingElement>(null)
  // al abrirlo se va al trabajo: el intento arriba, debajo de la barra de la lección, y el foco en su título
  useEffect(() => {
    heading.current?.focus()
    heading.current?.closest('section')?.scrollIntoView?.({ block: 'start' })
  }, [])
  const sticky = useStickyOffset()
  const formId = useId()

  // lo último que el servidor aceptó, solo para decir si hay algo sin guardar
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(answers()))
  const unsaved = JSON.stringify(answers()) !== savedSnapshot

  const saveNow = (next = answers()) =>
    save.mutate(next, {
      onSuccess: () => {
        setSavedAt(Date.now())
        setSavedSnapshot(JSON.stringify(next))
        // el fallo de un envío anterior ya no es cierto: lo guardado llegó
        submit.reset()
      }
    })

  // la pregunta actual. un solo juego de campos: en poco ancho las demás se ocultan con estilos y no se desmontan, así nada se pierde al cambiar de
  // pregunta (ni la respuesta, que vive en el borrador, ni el estado de una subida); en escritorio se ven todas y esto solo marca dónde se está
  const [current, setCurrent] = useState(0)
  const fieldsets = useRef<(HTMLFieldSetElement | null)[]>([])
  const pendingFocus = useRef<number | null>(null)
  const [jump, setJump] = useState(0)
  const scrolled = useCurrentOnScroll(setCurrent)
  const goTo = (index: number) => {
    scrolled.markJump()
    pendingFocus.current = index
    setCurrent(index)
    setJump((count) => count + 1)
  }
  // ya visible (el cambio de clase se pintó), se lleva a la pregunta: scroll-margin la deja debajo de la cabecera
  useEffect(() => {
    const index = pendingFocus.current
    if (index === null) return
    pendingFocus.current = null
    const fieldset = fieldsets.current[index]
    fieldset?.scrollIntoView?.({ block: 'start' })
    fieldset?.focus({ preventScroll: true })
  }, [jump])

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

  const saveStatus = save.isPending
    ? t('attempt.saving')
    : unsaved
      ? t('attempt.unsaved')
      : savedAt
        ? t('attempt.saved', { time: formatTime(savedAt, i18n.language, timeZone) })
        : ''
  const currentQuestion = questions[current]

  return (
    <section aria-labelledby={`attempt-${attempt.id}`} style={sticky.style} className={`@container flex scroll-mt-14 flex-col gap-5 ${CLEAR_HEADER}`}>
      <header
        ref={sticky.ref}
        className="sticky top-(--classroom-bar,3.5rem) z-[9] -mx-4 flex flex-col gap-2 border-b border-border bg-surface px-4 py-2 sm:mx-0 sm:rounded-lg sm:border sm:px-4"
      >
        <div className="flex flex-col gap-1 @2xl:flex-row @2xl:items-center @2xl:justify-between @2xl:gap-4">
          <div className="flex min-w-0 flex-col">
            <p className="hidden truncate text-secondary font-semibold text-ink @2xl:block">{title}</p>
            <div className="flex flex-wrap items-center gap-x-2 text-secondary text-ink-muted">
              <span className="inline-flex items-center gap-1 font-medium text-ink @2xl:font-normal @2xl:text-ink-muted">
                <h3 id={`attempt-${attempt.id}`} ref={heading} tabIndex={-1} className="focus:outline-none">
                  {t('attempt.title', { number: attempt.number })}
                </h3>
                <span>{t('attempt.ofMax', { max: maxAttempts })}</span>
              </span>
              <span className="hidden @2xl:inline-flex">
                <span aria-hidden="true" className="flex items-center gap-1">
                  {attemptMarks(maxAttempts, attempt.number - 1, true).map((mark, index) => (
                    <StateMark key={index} state={mark} />
                  ))}
                </span>
              </span>
              {currentQuestion ? (
                <span className="tabular-nums">{t('attempt.position', { number: currentQuestion.order, total: questions.length })}</span>
              ) : null}
              <span role="status" className={`tabular-nums ${unsaved && !save.isPending ? 'font-medium text-ink' : ''}`}>
                {saveStatus}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 @2xl:justify-end">
            {attempt.deadline ? <Countdown deadline={attempt.deadline} now={now} /> : <span />}
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" aria-label={t('attempt.save')} className="min-h-11" disabled={busy} onClick={() => saveNow()}>
                {save.isPending ? t('attempt.saving') : t('attempt.saveShort')}
              </Button>
              <Button type="submit" form={formId} className="min-h-11" disabled={busy}>
                {submit.isPending ? t('attempt.submitting') : t('attempt.submit')}
              </Button>
            </div>
          </div>
        </div>
        {/* en la cabecera, a la vista desde cualquier pregunta; si no cabe, se desplaza por dentro y no se come la pantalla */}
        {!online || error ? (
          <div className="flex max-h-[35dvh] flex-col gap-2 overflow-y-auto">
            {!online ? <Notice tone="danger">{t('attempt.offline')}</Notice> : null}
            {error && !(error instanceof TypeError && !online) ? <AttemptActionProblem error={error} deadline={attempt.deadline} unsaved /> : null}
          </div>
        ) : null}
      </header>

      {expired ? <Notice tone="warning">{t('attempt.expiredLocal')}</Notice> : null}

      {/* según el ancho del intento y no de la ventana: a 1024 px con el menú y el temario abiertos queda lo mismo que en un móvil */}
      <div className="flex flex-col gap-6 @2xl:grid @2xl:grid-cols-[minmax(0,1fr)_11rem] @2xl:items-start @2xl:gap-8">
        {/* antes en el documento: en poco ancho queda sobre la pregunta; con ancho, es un riel que acompaña */}
        <aside className="flex flex-col gap-3 @2xl:sticky @2xl:top-[calc(var(--attempt-top)+0.75rem)] @2xl:order-last @2xl:max-h-[calc(100dvh-var(--attempt-top)-1.5rem)] @2xl:overflow-y-auto">
          <div className="flex flex-col gap-0.5 text-secondary text-ink-muted">
            <p className="font-medium text-ink">{t('attempt.answered', { answered, total: questions.length })}</p>
            {attempt.deadline ? <DeadlineNote deadline={attempt.deadline} timeZone={timeZone} /> : <p>{t('attempt.noLimit')}</p>}
          </div>
          <QuestionIndex questions={questions} answers={draft} current={current} onGo={goTo} />
        </aside>

        <form
          id={formId}
          className="flex min-w-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            // Intro en una respuesta corta también envía el formulario: el botón desactivado no basta
            if (!busy) setConfirming(true)
          }}
        >
          <div className="flex flex-col @2xl:divide-y @2xl:divide-border">
            {questions.map((question, index) => (
              <div
                key={question.id}
                data-question=""
                ref={(element) => {
                  scrolled.elements.current[index] = element
                }}
                onFocus={() => setCurrent(index)}
                className={`@2xl:py-7 @2xl:first:pt-0 @2xl:last:pb-0 ${index === current ? '' : '@max-2xl:hidden'}`}
              >
                <QuestionField
                  fieldsetRef={(element) => {
                    fieldsets.current[index] = element
                  }}
                  question={question}
                  answer={draft[question.id] ?? emptyAnswer(question.id)}
                  saved={attempt.answers.find((answer) => answer.questionId === question.id)}
                  disabled={submit.isPending}
                  onChange={(answer) => {
                    changeAnswer(question.id, () => answer)
                    setCurrent(index)
                  }}
                  onUpload={uploadFor(question.id)}
                />
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 @2xl:hidden">
            {current > 0 ? (
              <Button type="button" variant="secondary" className="min-h-11 gap-1 px-2" onClick={() => goTo(current - 1)}>
                <ChevronLeft aria-hidden="true" className="size-5" />
                {t('attempt.previous')}
              </Button>
            ) : (
              <span />
            )}
            {current < questions.length - 1 ? (
              <Button type="button" variant="secondary" className="min-h-11 gap-1 px-2" onClick={() => goTo(current + 1)}>
                {t('attempt.next')}
                <ChevronRight aria-hidden="true" className="size-5" />
              </Button>
            ) : null}
          </div>
        </form>
      </div>

      <SubmitDialog
        open={confirming}
        answered={answered}
        total={questions.length}
        blank={blank.map(({ question, index }) => ({ index, number: question.order }))}
        busy={submit.isPending}
        onCancel={() => setConfirming(false)}
        onGo={(index) => {
          setConfirming(false)
          goTo(index)
        }}
        onConfirm={() => {
          setConfirming(false)
          submit.mutate(answers())
        }}
      />
    </section>
  )
}

// entregar: qué falta, con un enlace a cada pregunta en blanco. Dialog y no ConfirmDialog, cuya descripción es un párrafo que no admite una lista
function SubmitDialog({
  open,
  answered,
  total,
  blank,
  busy,
  onCancel,
  onGo,
  onConfirm
}: {
  open: boolean
  answered: number
  total: number
  blank: { index: number; number: number }[]
  busy: boolean
  onCancel: () => void
  onGo: (index: number) => void
  onConfirm: () => void
}) {
  const { t } = useTranslation('classroom')
  // al ir a una pregunta el foco es de ella, no del botón que abrió el diálogo
  const going = useRef(false)
  const listLabel = useId()
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      {open ? <ReturnFocus /> : null}
      <DialogContent
        onCloseAutoFocus={(event) => {
          if (going.current) event.preventDefault()
          going.current = false
        }}
        className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto"
      >
        <DialogTitle className="pr-10 text-h4 text-ink">{t('attempt.confirmTitle')}</DialogTitle>
        <DialogDescription className="mt-2 text-ink-muted">
          {blank.length > 0 ? t('attempt.confirmUnanswered', { count: blank.length, answered, total }) : t('attempt.confirmAll')}
        </DialogDescription>
        {blank.length > 0 ? (
          <div className="mt-3">
            <p id={listLabel} className="text-secondary font-medium text-ink">
              {t('attempt.blankTitle')}
            </p>
            <ul aria-labelledby={listLabel} className="grid max-h-48 grid-cols-2 gap-x-4 overflow-y-auto sm:grid-cols-3">
              {blank.map(({ index, number }) => (
                <li key={index}>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center rounded-sm text-secondary text-link underline underline-offset-4"
                    onClick={() => {
                      going.current = true
                      onGo(index)
                    }}
                  >
                    {t('attempt.blankItem', { number })}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="min-h-11" onClick={onCancel}>
            {t('attempt.confirmCancel')}
          </Button>
          <Button className="min-h-11" disabled={busy} onClick={onConfirm}>
            {t('attempt.confirmSubmit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// un fallo al empezar, guardar, subir o enviar (RNF-UX-08). el servidor manda: un 409 es una regla suya (plazo vencido, intento ya enviado,
// intentos agotados, matrícula no activa) y se explica con lo que diga su detalle
// unsaved: quien lo muestra tiene respuestas en pantalla, y cuenta la verdad sobre ellas: en esta página, no en el servidor ni en este navegador
export function AttemptActionProblem({ error, deadline, unsaved = false }: { error: unknown; deadline?: string | null; unsaved?: boolean }) {
  const { t } = useTranslation('classroom')
  if (error instanceof ApiError && error.status === 409) {
    const late = deadline != null && Date.parse(deadline) <= Date.now()
    return (
      <Notice tone="warning" title={late ? t('attempt.expired') : t('attempt.conflict')}>
        {error.message ? t('attempt.serverSays', { detail: error.message }) : null}
      </Notice>
    )
  }
  if (error instanceof ApiError && error.status === 400) return <Notice tone="danger">{t('attempt.invalid')}</Notice>
  // un 403 no culpa a las respuestas; sin conexión (fetch lanza TypeError) lo escrito sigue en la pantalla
  if (error instanceof ApiError && error.status === 403) return <Notice tone="danger">{t('attempt.refused')}</Notice>
  if (error instanceof TypeError) return <Notice tone="danger">{t(unsaved ? 'attempt.networkUnsaved' : 'attempt.network')}</Notice>
  const failed = error instanceof ApiError ? t('attempt.failedStatus', { status: error.status }) : t('attempt.failed')
  if (!unsaved) return <Notice tone="danger">{failed}</Notice>
  return (
    <Notice tone="danger" title={failed}>
      {t('attempt.keepPage')}
    </Notice>
  )
}
