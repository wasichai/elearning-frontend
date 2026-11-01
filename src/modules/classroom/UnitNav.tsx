import { useWasichaiLinks } from '@wasichai/core'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatNumber } from '../../shared/format'
import type { Classroom, Lesson, Unit } from './contract'
import { ProgressBar } from './parts'
import { courseKnots, Knot, knotOf } from './Quipu'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'

// la navegación lateral del aula: el progreso del curso, y las unidades con sus lecciones y su estado.
// en pantallas anchas se queda fija junto a la lectura; en el móvil se pliega tras un botón para no taparla
export function UnitNav({ classroom, units, currentLessonId }: { classroom: Classroom; units: Unit[]; currentLessonId?: string }) {
  const { t } = useTranslation('classroom')
  const [open, setOpen] = useState(false)
  const panelId = useId()
  return (
    <div className="flex flex-col gap-3">
      <ProgressBar progress={classroom.progress} label={t('progress.course')} knots={knotsMatching(classroom.progress.totalLessons, courseKnots(units))} />
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="self-start rounded-sm text-sm text-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus lg:hidden"
      >
        {open ? t('classroom.hideUnits') : t('classroom.showUnits')}
      </button>
      <nav id={panelId} aria-label={t('classroom.units')} className={open ? 'block' : 'hidden lg:block'}>
        <ol className="flex flex-col gap-5">
          {units.map((unit) => (
            <li key={unit.id}>
              <UnitEntry enrollmentId={classroom.id} unit={unit} currentLessonId={currentLessonId} onNavigate={() => setOpen(false)} />
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
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
  onNavigate: () => void
}) {
  const { t, i18n } = useTranslation('classroom')
  const values = { completed: formatNumber(unit.progress.completedLessons, i18n.language), total: formatNumber(unit.progress.totalLessons, i18n.language) }
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-1.5">
      <h2 id={headingId} className="flex items-baseline justify-between gap-3 text-sm font-semibold text-ink">
        <span>{t('classroom.unit', { order: unit.order, title: unit.title })}</span>
        {unit.progress.totalLessons > 0 ? (
          <span className="shrink-0 text-xs font-normal text-ink-muted tabular-nums">
            <span aria-hidden="true">{t('classroom.unitProgress', values)}</span>
            <span className="sr-only">{t('classroom.unitProgressLabel', values)}</span>
          </span>
        ) : null}
      </h2>
      <ol className="flex flex-col">
        {unit.lessons.map((lesson) => (
          <li key={lesson.id}>
            <LessonLink enrollmentId={enrollmentId} lesson={lesson} current={lesson.id === currentLessonId} onNavigate={onNavigate} />
          </li>
        ))}
      </ol>
    </section>
  )
}

function LessonLink({ enrollmentId, lesson, current, onNavigate }: { enrollmentId: string; lesson: Lesson; current: boolean; onNavigate: () => void }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const status = lesson.progress.status
  return (
    <Link
      to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId }, { [LESSON_PARAM]: lesson.id })}
      aria-current={current ? 'page' : undefined}
      onClick={onNavigate}
      className={`-mx-2 flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus ${
        current ? 'bg-brand-soft font-medium text-ink' : 'text-ink hover:bg-surface-muted'
      }`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <Knot {...knotOf(lesson)} />
      </span>
      <span className="flex-1">{lesson.title}</span> <span className="sr-only">{t(`lessonStatus.${status}`)}</span>
    </Link>
  )
}

// los nudos del curso solo si son tantos como las lecciones que cuenta el servidor: si no, la barra (el progreso es honesto)
function knotsMatching(total: number, knots: ReturnType<typeof courseKnots>) {
  return knots.length === total ? knots : undefined
}
