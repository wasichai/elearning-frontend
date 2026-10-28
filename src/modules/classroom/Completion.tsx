import { ApiError, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button } from '@wasichai/ui'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { isDone, type Lesson } from './contract'
import type { PlacedLesson } from './lessons'
import { WRAP } from './parts'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'

interface CompletionProps {
  enrollmentId: string
  lesson: Lesson
  // la lección que sigue: la siguiente en orden o, al final del curso, una anterior que quedó por hacer
  upcoming?: PlacedLesson
  upcomingIsPending: boolean
  onMarkComplete: () => void
  marking: boolean
  error: unknown
  // la persona acaba de completarla aquí (no venía completada): el foco pasa al paso siguiente
  justCompleted: boolean
}

// cómo se completa la lección (ADR-0012) y, una vez completada, el paso siguiente bien a la vista
export function Completion({ enrollmentId, lesson, upcoming, upcomingIsPending, onMarkComplete, marking, error, justCompleted }: CompletionProps) {
  const { t } = useTranslation('classroom')
  const done = isDone(lesson.progress.status)
  return (
    <section aria-label={t('completion.section')} className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface-muted px-5 py-4">
      {error ? (
        <Alert tone={error instanceof ApiError && error.status === 409 ? 'notice' : 'danger'}>
          {error instanceof ApiError && error.status === 409 ? t('completion.conflict') : t('completion.failed')}
        </Alert>
      ) : null}
      {done ? (
        <>
          <p role="status" className="text-base font-semibold text-success">
            {t('completion.done')}
          </p>
          <UpcomingStep enrollmentId={enrollmentId} upcoming={upcoming} pending={upcomingIsPending} focus={justCompleted} />
        </>
      ) : lesson.completion === 'EXPLICIT' ? (
        <Button onClick={onMarkComplete} disabled={marking} className={WRAP}>
          {marking ? t('completion.marking') : t('completion.mark')}
        </Button>
      ) : (
        <p className="text-sm text-ink-muted">{t(`completion.how.${lesson.completion}`)}</p>
      )}
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
      <div className="flex flex-col items-start gap-2 text-sm">
        <p className="text-ink">{t('completion.courseDone')}</p>
        <Button asChild variant="secondary" size="sm">
          <Link ref={ref} to={links.to(CLASSROOM_ROUTES.enrollments)}>
            {t('completion.backToCourses')}
          </Link>
        </Button>
      </div>
    )
  return (
    <div className="flex flex-col items-start gap-1.5">
      {pending ? <p className="text-sm text-ink-muted">{t('completion.pending')}</p> : null}
      <Button asChild className={WRAP}>
        <Link
          ref={ref}
          to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId }, { [LESSON_PARAM]: upcoming.lesson.id })}
          aria-label={t('completion.nextLabel', { lesson: upcoming.lesson.title })}
        >
          {t('completion.next')}
        </Link>
      </Button>
      <p aria-hidden="true" className="text-sm text-ink">
        {upcoming.lesson.title}
      </p>
    </div>
  )
}
