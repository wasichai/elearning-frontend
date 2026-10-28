import { useWasichaiLinks } from '@wasichai/core'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatNumber } from '../../shared/format'
import type { PlacedLesson } from './lessons'
import { useOpenLabel } from './parts'
import { Resources } from './Resources'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'

interface LessonViewProps {
  enrollmentId: string
  placed: PlacedLesson
  previous?: PlacedLesson
  next?: PlacedLesson
}

// la lección abierta: lectura amplia, su material y el paso siguiente
export function LessonView({ enrollmentId, placed, previous, next }: LessonViewProps) {
  const { t, i18n } = useTranslation('classroom')
  const lessonType = useOpenLabel('lessonType')
  const { lesson, unit } = placed
  const heading = useFocusOnChange(lesson.id)
  return (
    <article aria-labelledby={`lesson-${lesson.id}`} className="flex min-w-0 flex-col gap-6 lg:max-w-4xl">
      <header className="flex flex-col gap-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{t('classroom.position', { unit: unit.order, lesson: lesson.order })}</p>
        <h2 id={`lesson-${lesson.id}`} ref={heading} tabIndex={-1} className="text-2xl font-semibold tracking-tight text-balance text-ink focus:outline-none">
          {lesson.title}
        </h2>
        <p className="text-sm text-ink-muted">
          {lessonType(lesson.type)}
          {lesson.durationMinutes === null ? null : ` · ${t('classroom.minutes', { value: formatNumber(lesson.durationMinutes, i18n.language) })}`}
        </p>
        {lesson.summary ? <p className="max-w-prose text-base text-ink">{lesson.summary}</p> : null}
      </header>

      <Resources resources={lesson.resources} />

      <LessonSteps enrollmentId={enrollmentId} previous={previous} next={next} />
    </article>
  )
}

function LessonSteps({ enrollmentId, previous, next }: { enrollmentId: string; previous?: PlacedLesson; next?: PlacedLesson }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const to = (placed: PlacedLesson) => links.to(CLASSROOM_ROUTES.classroom, { enrollmentId }, { [LESSON_PARAM]: placed.lesson.id })
  if (!previous && !next) return null
  return (
    <nav aria-label={t('classroom.steps')} className="flex flex-col gap-3 border-t border-border pt-4 text-sm sm:flex-row sm:justify-between">
      {previous ? (
        <Link to={to(previous)} className="flex flex-col text-link underline-offset-4 hover:underline">
          <span className="text-xs text-ink-muted">{t('classroom.previous')}</span>
          <span>{previous.lesson.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link to={to(next)} className="flex flex-col text-link underline-offset-4 hover:underline sm:text-right">
          <span className="text-xs text-ink-muted">{t('classroom.next')}</span>
          <span>{next.lesson.title}</span>
        </Link>
      ) : null}
    </nav>
  )
}

// al cambiar de lección (no al abrir la página), el foco pasa a su título: quien navega con teclado o lector sigue leyendo ahí
function useFocusOnChange(key: string) {
  const ref = useRef<HTMLHeadingElement>(null)
  const previous = useRef(key)
  useEffect(() => {
    if (previous.current === key) return
    previous.current = key
    ref.current?.focus()
  }, [key])
  return ref
}
