import { useWasichaiLinks } from '@wasichai/core'
import { ChevronRight } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatNumber } from '../../shared/format'
import { SegmentedProgress, type ProgressUnit } from '../../shared/SegmentedProgress'
import { lessonMark, StateMark } from '../../shared/StateMark'
import { Achievements } from './Achievements'
import type { Classroom, Lesson, Unit } from './contract'
import { CourseFigures } from './CourseFrame'
import { OfferingDates, ROW_FOCUS, useOpenLabel } from './parts'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'

// el índice del curso como el de un libro (docs/design-system/colofon/Classroom.dc.html): arriba el progreso segmentado, las cifras, las
// fechas y los logros; después cada unidad con «Unidad n — x de y» y sus lecciones numeradas «n.m». solo la unidad de la lección abierta
// se despliega por sí sola. en escritorio es la columna izquierda del aula; en el móvil, la hoja inferior, que ya lleva el título
// (titled=false). quien lo monta dice qué hacer al elegir una lección
export function UnitNav({
  classroom,
  units,
  currentLessonId,
  onNavigate,
  titled = true
}: {
  classroom: Classroom
  units: Unit[]
  currentLessonId?: string
  onNavigate?: () => void
  titled?: boolean
}) {
  const { t } = useTranslation('classroom')
  return (
    <section aria-label={t('classroom.index')} className="flex flex-col gap-5">
      {titled ? <h2 className="meta border-b border-ink px-2 pb-2 text-ink">{t('classroom.index')}</h2> : null}
      <div className="flex flex-col gap-3 px-2">
        <SegmentedProgress units={progressUnits(units)} currentLessonId={currentLessonId} />
        <CourseFigures classroom={classroom} lessons={false} stacked />
        <OfferingDates offering={classroom.offering} />
      </div>
      <Achievements classroom={classroom} units={units} onNavigate={onNavigate} />
      <nav aria-label={t('classroom.units')}>
        <ol className="flex flex-col gap-1">
          {units.map((unit) => (
            <li key={unit.id}>
              <UnitEntry enrollmentId={classroom.id} unit={unit} currentLessonId={currentLessonId} onNavigate={onNavigate} />
            </li>
          ))}
        </ol>
      </nav>
    </section>
  )
}

// las lecciones que cuentan para el progreso del curso, como las cuenta el servidor: una NOT_YET todavía no se puede completar
export function progressUnits(units: Unit[]): ProgressUnit[] {
  return units.map((unit) => ({
    id: unit.id,
    title: unit.title,
    lessons: unit.lessons
      .filter((lesson) => lesson.completion !== 'NOT_YET')
      .map((lesson) => ({ id: lesson.id, title: lesson.title, state: lesson.progress.status }))
  }))
}

function UnitEntry({
  enrollmentId,
  unit,
  currentLessonId,
  onNavigate
}: {
  enrollmentId: string
  unit: Unit
  currentLessonId?: string
  onNavigate?: () => void
}) {
  const { t, i18n } = useTranslation('classroom')
  const values = { completed: formatNumber(unit.progress.completedLessons, i18n.language), total: formatNumber(unit.progress.totalLessons, i18n.language) }
  const holdsCurrent = unit.lessons.some((lesson) => lesson.id === currentLessonId)
  return (
    // React solo toca open cuando holdsCurrent cambia: la unidad abierta sigue a la lección actual y, entre tanto, quien mira abre y pliega lo que quiera
    <details open={holdsCurrent} className="group/unit">
      <summary
        className={`flex min-h-12 cursor-pointer list-none items-start gap-2 rounded px-2 py-2 hover:bg-surface [&::-webkit-details-marker]:hidden ${ROW_FOCUS}`}
      >
        <ChevronRight
          aria-hidden="true"
          className="mt-1 size-4 shrink-0 text-ink-muted transition-transform duration-[160ms] group-open/unit:rotate-90 motion-reduce:transition-none"
        />
        <h3 className="flex min-w-0 flex-1 flex-col gap-0.5 text-ink">
          <span className="font-read text-h5 break-words">{t('classroom.unit', { order: unit.order, title: unit.title })}</span>
          {unit.progress.totalLessons > 0 ? (
            <span className="text-secondary text-ink-muted tabular-nums">
              <span aria-hidden="true">{t('classroom.unitTally', { order: unit.order, ...values })}</span>
              <span className="sr-only">{t('classroom.unitProgressLabel', values)}</span>
            </span>
          ) : null}
        </h3>
      </summary>
      {unit.lessons.length === 0 ? (
        <p className="text-secondary pb-3 pl-8 text-ink-muted">{t('classroom.unitEmpty')}</p>
      ) : (
        <ol className="flex flex-col pb-2">
          {unit.lessons.map((lesson) => (
            <li key={lesson.id}>
              <LessonLink enrollmentId={enrollmentId} unit={unit} lesson={lesson} current={lesson.id === currentLessonId} onNavigate={onNavigate} />
            </li>
          ))}
        </ol>
      )}
    </details>
  )
}

function LessonLink({
  enrollmentId,
  unit,
  lesson,
  current,
  onNavigate
}: {
  enrollmentId: string
  unit: Unit
  lesson: Lesson
  current: boolean
  onNavigate?: () => void
}) {
  const { t, i18n } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const lessonType = useOpenLabel('lessonType')
  const metaId = useId()
  const minutes = lesson.durationMinutes === null ? null : t('classroom.minutes', { value: formatNumber(lesson.durationMinutes, i18n.language) })
  return (
    <Link
      to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId }, { [LESSON_PARAM]: lesson.id })}
      aria-current={current ? 'page' : undefined}
      // el enlace se llama por el título y el estado; el tipo y la duración son su descripción, y el número «1.2» es para el ojo
      aria-describedby={metaId}
      onClick={onNavigate}
      className={`grid min-h-12 grid-cols-[1rem_2.25rem_minmax(0,1fr)] items-start gap-x-2 rounded px-2 py-2 text-ink ${ROW_FOCUS} ${
        current ? 'bg-surface inset-ring inset-ring-border' : 'hover:bg-surface'
      }`}
    >
      {/* la forma de la marca dice el estado; la palabra, para el lector de pantalla */}
      <StateMark state={lessonMark(lesson.progress.status)} className="mt-1" />
      <span aria-hidden="true" className="text-secondary pt-0.5 text-ink-muted tabular-nums">
        {t('classroom.number', { unit: unit.order, lesson: lesson.order })}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={`font-read text-body break-words ${current ? 'font-semibold' : ''}`}>{lesson.title}</span>{' '}
        <span className="sr-only">{t(`lessonStatus.${lesson.progress.status}`)}</span>
        <span id={metaId} aria-hidden="true" className="text-secondary text-ink-muted">
          {minutes ? `${lessonType(lesson.type)} · ${minutes}` : lessonType(lesson.type)}
        </span>
      </span>
    </Link>
  )
}
