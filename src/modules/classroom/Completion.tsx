import { ApiError, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button } from '@wasichai/ui'
import { CircleCheck } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { formatNumber } from '../../shared/format'
import { Notice } from '../../shared/Notice'
import { RETURN_TO_PARAM, TERMS_ROUTE, useTermsRefusal } from '../../shared/terms'
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
        {error ? <CompletionProblem error={error} /> : null}
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

// un 403 puede ser por no tener aceptados los términos (ADR-0037 del backend). no se saca a la persona de la lección que lee: se lo dice aquí y le
// da el camino, con la vuelta a esta misma lección
function CompletionProblem({ error }: { error: unknown }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const location = useLocation()
  const refusal = useTermsRefusal(error)
  if (refusal === 'checking') return null
  if (refusal === 'terms')
    return (
      <div className="flex flex-col gap-2">
        <Notice tone="warning">{t('completion.termsRequired')}</Notice>
        {links.has(TERMS_ROUTE) ? (
          <Button asChild variant="secondary" className={`${WRAP} self-start`}>
            <Link to={links.to(TERMS_ROUTE, {}, { [RETURN_TO_PARAM]: location.pathname + location.search })}>{t('completion.termsAction')}</Link>
          </Button>
        ) : null}
      </div>
    )
  const conflict = error instanceof ApiError && error.status === 409
  return <Alert tone={conflict ? 'notice' : 'danger'}>{conflict ? t('completion.conflict') : t('completion.failed')}</Alert>
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
      {/* con el temario abierto a 1024 no cabe y quedaría cortado; el título sigue en «Siguiente», sobre el pie */}
      <p aria-hidden="true" className="min-w-0 truncate text-sm text-ink-muted sm:hidden xl:block">
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
