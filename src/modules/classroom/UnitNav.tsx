import { useWasichaiLinks } from '@wasichai/core'
import { ChevronRight } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatNumber } from '../../shared/format'
import { lessonIcon } from '../../shared/lessonIcon'
import { isDone, type Classroom, type Lesson, type Unit } from './contract'
import { CourseFigures } from './CourseFrame'
import { OfferingDates, ProgressBar, useOpenLabel } from './parts'
import { courseKnots, Knot, knotOf } from './Quipu'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'

const ROW_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus'
const UNIT_ROW = '-mx-2 flex min-h-13 cursor-pointer list-none items-center gap-2 rounded-md px-2 py-2 hover:bg-surface-muted'

// el temario: el resumen del curso (su avance y sus fechas) y las unidades con sus lecciones, de las que solo la actual se abre por sí sola.
// en escritorio va en el panel lateral; en el móvil, en una hoja inferior. quien lo monta dice qué hacer al elegir una lección
export function UnitNav({
  classroom,
  units,
  currentLessonId,
  onNavigate
}: {
  classroom: Classroom
  units: Unit[]
  currentLessonId?: string
  onNavigate?: () => void
}) {
  const { t } = useTranslation('classroom')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <ProgressBar progress={classroom.progress} label={t('progress.course')} knots={knotsMatching(classroom.progress.totalLessons, courseKnots(units))} />
        <CourseFigures classroom={classroom} lessons={false} stacked />
        <OfferingDates offering={classroom.offering} />
      </div>
      <nav aria-label={t('classroom.units')} className="border-t border-border">
        <ol className="flex flex-col divide-y divide-border">
          {units.map((unit) => (
            <li key={unit.id}>
              <UnitEntry enrollmentId={classroom.id} unit={unit} currentLessonId={currentLessonId} onNavigate={onNavigate} />
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
  onNavigate?: () => void
}) {
  const { t, i18n } = useTranslation('classroom')
  const values = { completed: formatNumber(unit.progress.completedLessons, i18n.language), total: formatNumber(unit.progress.totalLessons, i18n.language) }
  const holdsCurrent = unit.lessons.some((lesson) => lesson.id === currentLessonId)
  return (
    // React solo toca open cuando holdsCurrent cambia: la unidad abierta sigue a la lección actual y, entre tanto, quien mira abre y pliega lo que quiera
    <details open={holdsCurrent} className="group/unit">
      <summary className={`${UNIT_ROW} ${ROW_FOCUS} [&::-webkit-details-marker]:hidden`}>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-ink-muted transition-transform duration-[160ms] group-open/unit:rotate-90 motion-reduce:transition-none"
        />
        <h2 className="flex min-w-0 flex-1 items-baseline justify-between gap-3 text-sm font-semibold text-ink">
          <span className="min-w-0">{t('classroom.unit', { order: unit.order, title: unit.title })}</span>
          {unit.progress.totalLessons > 0 ? (
            <span className="shrink-0 text-xs font-normal text-ink-muted tabular-nums">
              <span aria-hidden="true">{t('classroom.unitProgress', values)}</span>
              <span className="sr-only">{t('classroom.unitProgressLabel', values)}</span>
            </span>
          ) : null}
        </h2>
      </summary>
      {unit.lessons.length === 0 ? (
        <p className="pb-3 pl-6 text-sm text-ink-muted">{t('classroom.unitEmpty')}</p>
      ) : (
        <ol className="flex flex-col pb-2">
          {unit.lessons.map((lesson) => (
            <li key={lesson.id} className="group/lesson">
              <LessonLink enrollmentId={enrollmentId} lesson={lesson} current={lesson.id === currentLessonId} onNavigate={onNavigate} />
            </li>
          ))}
        </ol>
      )}
    </details>
  )
}

function LessonLink({ enrollmentId, lesson, current, onNavigate }: { enrollmentId: string; lesson: Lesson; current: boolean; onNavigate?: () => void }) {
  const { t, i18n } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const lessonType = useOpenLabel('lessonType')
  const metaId = useId()
  const status = lesson.progress.status
  const Icon = lessonIcon(lesson.type)
  const minutes = lesson.durationMinutes === null ? null : t('classroom.minutes', { value: formatNumber(lesson.durationMinutes, i18n.language) })
  const statusTone = current ? 'text-ink' : isDone(status) ? 'text-success' : status === 'INICIADA' ? 'text-brand-strong' : 'text-ink-muted'
  return (
    <Link
      to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId }, { [LESSON_PARAM]: lesson.id })}
      aria-current={current ? 'page' : undefined}
      // el enlace se llama por el título y el estado; el tipo y la duración son su descripción
      aria-describedby={metaId}
      onClick={onNavigate}
      className={`relative -mx-2 flex min-h-12 items-center gap-2.5 rounded-md px-2 py-1.5 text-sm ${ROW_FOCUS} ${
        current ? 'bg-brand-soft text-ink' : 'text-ink hover:bg-surface-muted'
      }`}
    >
      {/* el hilo del quipu baja por la unidad y cada lección es un nudo */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-[1.0625rem] w-0.5 bg-border-control group-first/lesson:top-1/2 group-last/lesson:bottom-1/2"
      />
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <Knot {...knotOf(lesson)} />
      </span>
      <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5">
        <span className={`col-span-2 ${current ? 'font-medium' : ''}`}>{lesson.title}</span>{' '}
        <span className={`col-start-2 row-start-2 self-center text-xs ${statusTone}`}>{t(`lessonStatus.${status}`)}</span>
        <span
          id={metaId}
          aria-hidden="true"
          className={`col-start-1 row-start-2 flex min-w-0 items-center gap-1 text-xs ${current ? 'text-ink' : 'text-ink-muted'}`}
        >
          <Icon aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="min-w-0 truncate">{minutes ? `${lessonType(lesson.type)} · ${minutes}` : lessonType(lesson.type)}</span>
        </span>
      </span>
    </Link>
  )
}

// los nudos del curso solo si son tantos como las lecciones que cuenta el servidor: si no, la barra (el progreso es honesto)
function knotsMatching(total: number, knots: ReturnType<typeof courseKnots>) {
  return knots.length === total ? knots : undefined
}
