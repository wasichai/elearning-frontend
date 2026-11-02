import { ApiError, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button } from '@wasichai/ui'
import { CircleCheck } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatNumber } from '../../shared/format'
import { isDone, type Lesson } from './contract'
import type { PlacedLesson } from './lessons'
import { LESSON_COLUMN, WRAP } from './parts'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'

interface CompletionProps {
  enrollmentId: string
  lesson: Lesson
  // la lección que sigue: la siguiente en orden o, al final del curso, una anterior que quedó por hacer
  upcoming?: PlacedLesson
  upcomingIsPending: boolean
  // fracción del vídeo que lo completa (RF-AUL-04): si no es el final, el texto dice cuánto
  videoThreshold: number
  onMarkComplete: () => void
  marking: boolean
  error: unknown
  // la persona acaba de completarla aquí (no venía completada): el foco pasa al paso siguiente
  justCompleted: boolean
  // con una lectura que llena la ventana, el pie se queda a la vista: la acción no espera al final del documento
  sticky?: boolean
}

// cómo se completa la lección (ADR-0012) y, una vez completada, el paso siguiente bien a la vista
export function Completion({
  enrollmentId,
  lesson,
  upcoming,
  upcomingIsPending,
  videoThreshold,
  onMarkComplete,
  marking,
  error,
  justCompleted,
  sticky = false
}: CompletionProps) {
  const { t, i18n } = useTranslation('classroom')
  const done = isDone(lesson.progress.status)
  return (
    <section aria-label={t('completion.section')} className={`border-t border-border bg-surface ${sticky ? 'sticky bottom-0 z-10' : ''}`}>
      <div className={`${LESSON_COLUMN} flex flex-col gap-2 py-2.5`}>
        {error ? (
          <Alert tone={error instanceof ApiError && error.status === 409 ? 'notice' : 'danger'}>
            {error instanceof ApiError && error.status === 409 ? t('completion.conflict') : t('completion.failed')}
          </Alert>
        ) : null}
        {done ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p role="status" className="flex items-center gap-2 text-sm font-semibold text-success">
              <CircleCheck aria-hidden="true" className="size-5 shrink-0" />
              {t('completion.done')}
            </p>
            <UpcomingStep enrollmentId={enrollmentId} upcoming={upcoming} pending={upcomingIsPending} focus={justCompleted} />
          </div>
        ) : lesson.completion === 'EXPLICIT' ? (
          <Button onClick={onMarkComplete} disabled={marking} className={`${WRAP} w-full sm:ml-auto sm:w-auto`}>
            {marking ? t('completion.marking') : t('completion.mark')}
          </Button>
        ) : (
          <p className="flex min-h-11 items-center text-sm text-ink-muted">
            {lesson.completion === 'VIDEO_END' && videoThreshold < 1
              ? t('completion.videoPart', { percent: formatNumber(videoThreshold * 100, i18n.language) })
              : t(`completion.how.${lesson.completion}`)}
          </p>
        )}
      </div>
    </section>
  )
}

function UpcomingStep({ enrollmentId, upcoming, pending, focus }: { enrollmentId: string; upcoming?: PlacedLesson; pending: boolean; focus: boolean }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const ref = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    if (focus) ref.current?.focus()
  }, [focus])
  if (!upcoming)
    return (
      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:gap-3">
        <p className="text-ink">{t('completion.courseDone')}</p>
        <Button asChild variant="secondary">
          <Link ref={ref} to={links.to(CLASSROOM_ROUTES.enrollments)}>
            {t('completion.backToCourses')}
          </Link>
        </Button>
      </div>
    )
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      {pending ? <p className="text-sm text-ink-muted">{t('completion.pending')}</p> : null}
      <p aria-hidden="true" className="min-w-0 truncate text-sm text-ink-muted">
        {upcoming.lesson.title}
      </p>
      <Button asChild className={`${WRAP} shrink-0`}>
        <Link
          ref={ref}
          to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId }, { [LESSON_PARAM]: upcoming.lesson.id })}
          aria-label={t('completion.nextLabel', { lesson: upcoming.lesson.title })}
        >
          {t('completion.next')}
        </Link>
      </Button>
    </div>
  )
}
