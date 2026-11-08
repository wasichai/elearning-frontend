import { Alert, Input, Textarea } from '@wasichai/ui'
import { CircleCheck, FileUp, LoaderCircle } from 'lucide-react'
import { useId, useState, type ChangeEvent, type Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '../../shared/format'
import type { AnswerInput } from './api'
import type { Answer, Question } from './contract'
import { MAX_UPLOAD_BYTES } from '../../shared/files'
import { formatFileSize } from './parts'
import { StateMark } from '../../shared/StateMark'

// las preguntas de un intento abierto, una por tipo (ADR-0016): opción única y verdadero/falso con radio, múltiple con
// casillas, respuesta corta en una línea, abierta en un área de texto y archivo con su entrega

export function emptyAnswer(questionId: string): AnswerInput {
  return { questionId, optionIds: [], text: null, submissionId: null }
}

export function isAnswered(answer: AnswerInput | undefined): boolean {
  return answer !== undefined && (answer.optionIds.length > 0 || (answer.text ?? '').trim() !== '' || answer.submissionId !== null)
}

// sube el archivo de una pregunta y devuelve el error que mostrar, si lo hubo
export interface Uploader {
  (file: File): Promise<string | undefined>
}

interface QuestionFieldProps {
  question: Question
  answer: AnswerInput
  // la entrega que conoce el servidor (con su archivo), si la hay
  saved?: Answer
  disabled: boolean
  onChange: (answer: AnswerInput) => void
  onUpload: Uploader
  // al ir a una pregunta (índice, anterior y siguiente, diálogo de entrega), el foco va a su grupo
  fieldsetRef?: Ref<HTMLFieldSetElement>
}

export function QuestionField({ question, answer, saved, disabled, onChange, onUpload, fieldsetRef }: QuestionFieldProps) {
  const { t, i18n } = useTranslation('classroom')
  const promptId = useId()
  return (
    <fieldset ref={fieldsetRef} tabIndex={-1} className="flex min-w-0 flex-col gap-4 focus:outline-none" aria-describedby={`${promptId}-points`}>
      <legend id={promptId} className="float-left w-full font-read text-h5 font-medium text-ink @2xl:text-[19px]/[30px]">
        {t('question.prompt', { order: question.order, prompt: question.prompt })}
      </legend>
      <p id={`${promptId}-points`} className="-mt-2 text-sm text-ink-muted">
        {t('question.points', { count: question.points, value: formatNumber(question.points, i18n.language) })} · {t(`question.type.${question.type}`)}
      </p>
      <QuestionInput question={question} answer={answer} saved={saved} disabled={disabled} onChange={onChange} onUpload={onUpload} promptId={promptId} />
      {question.rubric.length > 0 ? <Rubric rubric={question.rubric} /> : null}
    </fieldset>
  )
}

function QuestionInput({ question, answer, saved, disabled, onChange, onUpload, promptId }: QuestionFieldProps & { promptId: string }) {
  const { t } = useTranslation('classroom')
  switch (question.type) {
    case 'SINGLE':
    case 'TRUE_FALSE':
    case 'MULTIPLE': {
      const multiple = question.type === 'MULTIPLE'
      const toggle = (optionId: string, checked: boolean) =>
        onChange({
          ...answer,
          optionIds: multiple ? (checked ? [...answer.optionIds, optionId] : answer.optionIds.filter((id) => id !== optionId)) : [optionId]
        })
      return (
        <div className="flex flex-col gap-2">
          {question.options.map((option) => (
            // toda la fila es el objetivo; la elegida se distingue por su control marcado, además del borde y el relleno
            <label
              key={option.id}
              className="flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface px-3 py-3 text-base text-ink hover:bg-surface-muted has-checked:border-brand has-checked:bg-brand-soft has-checked:inset-ring has-checked:inset-ring-brand has-disabled:cursor-not-allowed has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
            >
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={question.id}
                value={option.id}
                checked={answer.optionIds.includes(option.id)}
                disabled={disabled}
                onChange={(event) => toggle(option.id, event.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-brand focus-visible:outline-none"
              />
              <span>{option.text}</span>
            </label>
          ))}
        </div>
      )
    }
    case 'SHORT':
      return (
        <Input
          aria-labelledby={promptId}
          value={answer.text ?? ''}
          maxLength={500}
          disabled={disabled}
          onChange={(event) => onChange({ ...answer, text: event.target.value })}
          placeholder={t('question.shortPlaceholder')}
        />
      )
    case 'OPEN':
      return (
        <Textarea
          aria-labelledby={promptId}
          rows={8}
          value={answer.text ?? ''}
          disabled={disabled}
          onChange={(event) => onChange({ ...answer, text: event.target.value })}
        />
      )
    case 'FILE':
      return <FileQuestion answer={answer} saved={saved} disabled={disabled} onUpload={onUpload} promptId={promptId} />
  }
}

function FileQuestion({
  answer,
  saved,
  disabled,
  onUpload,
  promptId
}: {
  answer: AnswerInput
  saved?: Answer
  disabled: boolean
  onUpload: Uploader
  promptId: string
}) {
  const { t, i18n } = useTranslation('classroom')
  const [uploaded, setUploaded] = useState<string>()
  const [state, setState] = useState<{ busy: boolean; error?: string }>({ busy: false })
  const savedFile = saved?.submissionId === answer.submissionId ? saved?.submission?.file : undefined
  const name = uploaded ?? savedFile?.name
  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) {
      setState({ busy: false, error: t('question.fileTooBig', { size: formatFileSize(MAX_UPLOAD_BYTES, i18n.language) }) })
      return
    }
    setState({ busy: true })
    const error = await onUpload(file)
    if (error === undefined) setUploaded(file.name)
    setState({ busy: false, error })
  }
  return (
    <div className="flex flex-col items-start gap-3 text-sm">
      <p role="status" className={`flex items-center gap-2 font-medium ${answer.submissionId && !state.busy ? 'text-success' : 'text-ink'}`}>
        {state.busy ? (
          <LoaderCircle aria-hidden="true" className="size-5 shrink-0 animate-spin motion-reduce:animate-none" />
        ) : answer.submissionId ? (
          <CircleCheck aria-hidden="true" className="size-5 shrink-0" />
        ) : (
          <FileUp aria-hidden="true" className="size-5 shrink-0 text-ink-muted" />
        )}
        <span className="min-w-0 break-words">
          {state.busy
            ? t('question.uploading')
            : answer.submissionId
              ? name
                ? t('question.fileDelivered', { name })
                : t('question.fileDeliveredUnnamed')
              : t('question.fileNone')}
        </span>
      </p>
      {/* el control nativo: el lector anuncia la pregunta y el archivo elegido; el botón lo pinta el tema */}
      <input
        type="file"
        aria-labelledby={promptId}
        aria-describedby={`${promptId}-file-hint`}
        disabled={disabled || state.busy}
        onChange={(event) => void choose(event)}
        className="max-w-full text-sm text-ink-muted file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border file:border-border-control file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-surface-muted"
      />
      <p id={`${promptId}-file-hint`} className="text-ink-muted">
        {t('question.fileHint', { size: formatFileSize(MAX_UPLOAD_BYTES, i18n.language) })}
      </p>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
    </div>
  )
}

// el índice del intento: una marca de estado por pregunta (StateMark). llena con su visto, respondida; contorno, en blanco; la actual lleva además un recuadro.
// el número y el nombre accesible dicen lo mismo que la forma: el color nunca va solo. los mismos botones en móvil y escritorio
export function QuestionIndex({
  questions,
  answers,
  current,
  onGo
}: {
  questions: Question[]
  answers: Record<string, AnswerInput>
  current: number
  onGo: (index: number) => void
}) {
  const { t, i18n } = useTranslation('classroom')
  return (
    <nav aria-label={t('attempt.index')} className="flex flex-col gap-2">
      <ol className="flex flex-wrap @2xl:grid @2xl:grid-cols-4">
        {questions.map((question, index) => {
          const answered = isAnswered(answers[question.id])
          const active = index === current
          const number = formatNumber(question.order, i18n.language)
          return (
            <li key={question.id} className="relative">
              <span aria-hidden="true" className="absolute inset-x-0 top-3 h-0.5 bg-border-control" />
              <button
                type="button"
                aria-label={t(answered ? 'attempt.indexAnswered' : 'attempt.indexBlank', { number })}
                aria-current={active ? 'step' : undefined}
                onClick={() => onGo(index)}
                className={`relative flex size-11 flex-col items-center justify-start gap-0.5 rounded-md pt-1.5 text-xs tabular-nums hover:bg-surface-muted/60 ${
                  active ? 'font-semibold text-ink inset-ring-2 inset-ring-brand' : 'text-ink-muted'
                }`}
              >
                <StateMark state={answered ? 'done' : active ? 'started' : 'todo'} />
                <span aria-hidden="true">{number}</span>
              </button>
            </li>
          )
        })}
      </ol>
      <p aria-hidden="true" className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <StateMark state="done" />
          {t('attempt.legendAnswered')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <StateMark state="todo" />
          {t('attempt.legendBlank')}
        </span>
      </p>
    </nav>
  )
}

export function Rubric({ rubric }: { rubric: Question['rubric'] }) {
  const { t, i18n } = useTranslation('classroom')
  return (
    <div className="text-sm">
      <p className="font-medium text-ink">{t('question.rubric')}</p>
      <ul className="list-disc pl-5 text-ink-muted">
        {rubric.map((criterion) => (
          <li key={criterion.description}>
            {t('question.criterion', {
              description: criterion.description,
              points: t('question.points', { count: criterion.points, value: formatNumber(criterion.points, i18n.language) })
            })}
          </li>
        ))}
      </ul>
    </div>
  )
}
