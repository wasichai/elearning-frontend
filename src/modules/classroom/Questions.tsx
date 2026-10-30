import { Alert, Input, Textarea } from '@wasichai/ui'
import { useId, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '../../shared/format'
import type { AnswerInput } from './api'
import type { Answer, Question } from './contract'
import { MAX_UPLOAD_BYTES } from '../../shared/files'
import { formatFileSize } from './parts'

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
}

export function QuestionField({ question, answer, saved, disabled, onChange, onUpload }: QuestionFieldProps) {
  const { t, i18n } = useTranslation('classroom')
  const promptId = useId()
  return (
    <fieldset className="flex min-w-0 flex-col gap-3 rounded-card border border-border px-5 py-4" aria-describedby={`${promptId}-points`}>
      <legend id={promptId} className="float-left w-full text-base font-medium text-ink">
        {t('question.prompt', { order: question.order, prompt: question.prompt })}
      </legend>
      <p id={`${promptId}-points`} className="text-xs text-ink-muted">
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
            <label key={option.id} className="flex items-start gap-2.5 text-sm text-ink">
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={question.id}
                value={option.id}
                checked={answer.optionIds.includes(option.id)}
                disabled={disabled}
                onChange={(event) => toggle(option.id, event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-brand"
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
          rows={6}
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
    <div className="flex flex-col items-start gap-2 text-sm">
      <p role="status" className={answer.submissionId ? 'text-success' : 'text-ink-muted'}>
        {state.busy
          ? t('question.uploading')
          : answer.submissionId
            ? name
              ? t('question.fileDelivered', { name })
              : t('question.fileDeliveredUnnamed')
            : t('question.fileNone')}
      </p>
      {/* el control nativo: el lector anuncia la pregunta y el archivo elegido; el botón lo pinta el tema */}
      <input
        type="file"
        aria-labelledby={promptId}
        aria-describedby={`${promptId}-file-hint`}
        disabled={disabled || state.busy}
        onChange={(event) => void choose(event)}
        className="max-w-full text-sm text-ink-muted file:mr-3 file:rounded-md file:border file:border-border-control file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-surface-muted"
      />
      <p id={`${promptId}-file-hint`} className="text-xs text-ink-muted">
        {t('question.fileHint', { size: formatFileSize(MAX_UPLOAD_BYTES, i18n.language) })}
      </p>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
    </div>
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
