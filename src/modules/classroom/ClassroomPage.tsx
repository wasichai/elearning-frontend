import { EmptyState, useAppTitle } from '@wasichai/core'
import { Alert, Button, Dialog, DialogContent, DialogTitle, DialogTrigger } from '@wasichai/ui'
import { AArrowDown, AArrowUp, BookOpen, ListTree, Scan } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { SegmentedProgress } from '../../shared/SegmentedProgress'
import { useDocumentTitle } from '../../shared/useDocumentTitle'
import type { Classroom } from './contract'
import { CourseHeader, CourseQuery, CourseTabs } from './CourseFrame'
import { defaultLesson, lessonPath, neighbours, orderedUnits, type PlacedLesson } from './lessons'
import { LessonView } from './LessonView'
import { OfferingDates } from './parts'
import { useReadingPreferences, type ReadingControls } from './readingPreferences'
import { LESSON_PARAM } from './routes'
import { progressUnits, UnitNav } from './UnitNav'

// el aula de una matrícula
export function ClassroomPage() {
  return <CourseQuery>{(classroom) => <ClassroomView classroom={classroom} />}</CourseQuery>
}

// la composición del aula (docs/design-system/colofon/Classroom.dc.html, Responsive.dc.html y Mobile.dc.html):
// - a 1280 px o más, tres columnas: el índice, el texto en su medida y las notas al margen
// - de 1024 a 1279, el índice y el texto; las notas pasan detrás del texto
// - por debajo de 1024, el índice se abre en una hoja inferior y el progreso queda en la franja de arriba
// el modo foco deja solo el texto; el shell ya está en su forma estrecha con una lección abierta (shellChrome)
function ClassroomView({ classroom }: { classroom: Classroom }) {
  const { t } = useTranslation('classroom')
  const [params] = useSearchParams()
  const units = useMemo(() => orderedUnits(classroom), [classroom])
  const path = useMemo(() => lessonPath(units), [units])
  const requested = params.get(LESSON_PARAM)
  const found = requested ? path.find((placed) => placed.lesson.id === requested) : undefined
  const placed = found ?? defaultLesson(path, classroom.nextLesson?.id)
  const reading = useReadingPreferences()
  const [sheetOpen, setSheetOpen] = useState(false)
  // la pestaña dice la lección abierta (o el curso, si aún no tiene lecciones) y la aplicación
  const { appName } = useAppTitle()
  useDocumentTitle(
    placed
      ? t('classroom.documentTitle', { lesson: placed.lesson.title, course: classroom.course.title, app: appName })
      : t('classroom.documentTitleCourse', { course: classroom.course.title, app: appName })
  )
  const notices = (
    <>
      {requested && !found ? <Alert tone="notice">{t('classroom.lessonMissing')}</Alert> : null}
      {classroom.status === 'FINALIZADA' ? <Alert tone="notice">{t('classroom.finished')}</Alert> : null}
    </>
  )
  if (!placed)
    return (
      <div className="flex min-h-full flex-col">
        <CourseHeader classroom={classroom} />
        <div className="mx-auto flex w-full max-w-measure flex-col gap-4 px-4 py-8">
          {notices}
          <EmptyState title={t('classroom.empty')} icon={BookOpen}>
            <p>{t('classroom.emptyHint')}</p>
            <div className="[&>p]:justify-center">
              <OfferingDates offering={classroom.offering} />
            </div>
          </EmptyState>
        </div>
      </div>
    )
  const { previous, next } = neighbours(path, placed.lesson.id)
  const pending = path.find((candidate) => candidate.lesson.id === classroom.nextLesson?.id)
  const indexShown = !reading.focus && !reading.syllabusHidden
  const index = (onNavigate?: () => void, titled?: boolean) => (
    <UnitNav classroom={classroom} units={units} currentLessonId={placed.lesson.id} onNavigate={onNavigate} titled={titled} />
  )
  const hasReading = placed.lesson.resources.some((resource) => resource.type === 'HTML' && resource.file)
  return (
    // --classroom-bar: la altura de la barra del aula, que comparten el índice y la cabecera de un intento para quedar debajo de ella
    <div className="flex min-h-full flex-col [--classroom-bar:3.5rem]">
      <ClassroomBar classroom={classroom} placed={placed}>
        <ReadingTools
          controls={reading}
          hasReading={hasReading}
          index={<IndexControls shown={indexShown} onToggle={reading.toggleSyllabus} open={sheetOpen} onOpenChange={setSheetOpen} index={index} />}
        />
      </ClassroomBar>
      {/* la franja del curso: sus secciones y, mientras el índice no está a la vista, su progreso segmentado */}
      <div className="flex flex-wrap items-end gap-x-8 border-b border-border bg-surface-muted px-4 sm:px-6 lg:px-8">
        {/* en el teléfono el progreso está en la hoja del índice: la lectura empieza en la primera mitad de la pantalla */}
        <div className={`hidden w-full py-2.5 sm:block sm:max-w-[35rem] sm:flex-1 ${indexShown ? 'lg:hidden' : ''}`}>
          <SegmentedProgress units={progressUnits(units)} currentLessonId={placed.lesson.id} />
        </div>
        <CourseTabs classroom={classroom} lessonId={placed.lesson.id} />
      </div>
      <div className="flex flex-col gap-3 px-4 pt-4 empty:hidden sm:px-8">{notices}</div>
      <div className="flex min-w-0 flex-1">
        {/* el índice se queda a la vista mientras se lee (sticky bajo la barra del aula, dentro del área que desplaza el shell). con la
            hoja abierta no se pinta: está una sola vez en la página */}
        {indexShown && !sheetOpen ? (
          <div className="hidden w-index-col shrink-0 border-r border-border bg-surface-muted lg:block">
            <div className="sticky top-(--classroom-bar) max-h-[calc(100dvh-var(--classroom-bar))] overflow-y-auto px-3 pt-6 pb-10">{index()}</div>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <LessonView
            enrollmentId={classroom.id}
            timeZone={classroom.offering.timeZone}
            placed={placed}
            previous={previous}
            next={next}
            pending={pending}
            position={path.indexOf(placed) + 1}
            total={path.length}
            readingControls={reading}
          />
        </div>
      </div>
    </div>
  )
}

// la barra del aula, a la vista mientras se lee: el curso (el h1 de la página) y su unidad a la izquierda, las herramientas a la derecha
function ClassroomBar({ classroom, placed, children }: { classroom: Classroom; placed: PlacedLesson; children: ReactNode }) {
  const { t } = useTranslation('classroom')
  const unit = t('classroom.unit', { order: placed.unit.order, title: placed.unit.title })
  return (
    <header className="sticky top-0 z-20 flex h-(--classroom-bar) items-center gap-x-3 border-b border-border bg-surface-muted px-2 py-1.5 sm:px-4 lg:px-6">
      <div className="flex min-w-0 flex-1 flex-col px-2">
        <h1 title={classroom.course.title} className="meta truncate text-ink">
          {classroom.course.title}
        </h1>
        <p title={unit} className="text-secondary truncate text-ink-muted">
          {unit}
        </p>
      </div>
      {children}
    </header>
  )
}

// las herramientas de la lección (Classroom.dc.html): el índice, el tamaño del texto (18–24px) y el modo lectura, si hay lectura, y el
// modo foco. en el móvil solo sus iconos: cada botón lleva su nombre
function ReadingTools({ controls, hasReading, index }: { controls: ReadingControls; hasReading: boolean; index: ReactNode }) {
  const { t } = useTranslation('classroom')
  const rule = <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
  return (
    <div role="toolbar" aria-label={t('reading.tools')} className="ml-auto flex shrink-0 items-center gap-0.5">
      {index}
      {rule}
      {hasReading ? (
        <>
          <Button variant="ghost" size="icon" aria-label={t('reading.smaller')} disabled={!controls.canShrink} onClick={controls.shrink}>
            <AArrowDown aria-hidden="true" className="size-5" />
          </Button>
          <span className="sr-only" aria-live="polite">
            {t('reading.size', { value: controls.shownSize })}
          </span>
          <Button variant="ghost" size="icon" aria-label={t('reading.larger')} disabled={!controls.canGrow} onClick={controls.grow}>
            <AArrowUp aria-hidden="true" className="size-5" />
          </Button>
          <Button variant="ghost" aria-pressed={controls.mode} aria-label={t('reading.mode')} onClick={controls.toggleMode} className="min-w-11 gap-2 px-2.5">
            <BookOpen aria-hidden="true" className="size-5" />
            <span className="hidden sm:inline">{t('reading.mode')}</span>
          </Button>
        </>
      ) : null}
      <Button
        variant="ghost"
        aria-pressed={Boolean(controls.focus)}
        aria-label={t('reading.focus')}
        onClick={controls.toggleFocus}
        className="min-w-11 gap-2 px-2.5"
      >
        <Scan aria-hidden="true" className="size-5" />
        <span className="hidden sm:inline">{t('reading.focus')}</span>
      </Button>
    </div>
  )
}

// «Índice»: en escritorio pliega y despliega la columna; por debajo de 1024 la abre en una hoja inferior. la hoja atrapa el foco, se cierra con
// Esc o tocando el velo y lo devuelve al botón; si se cerró eligiendo una lección, el foco es de su título (LessonView)
function IndexControls({
  shown,
  onToggle,
  open,
  onOpenChange,
  index
}: {
  shown: boolean
  onToggle: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
  index: (onNavigate?: () => void, titled?: boolean) => ReactNode
}) {
  const { t } = useTranslation('classroom')
  const navigated = useRef(false)
  return (
    <>
      <Button variant="ghost" aria-pressed={shown} onClick={onToggle} className="hidden min-w-11 gap-2 px-2.5 lg:inline-flex">
        <ListTree aria-hidden="true" className="size-5" />
        {t('classroom.index')}
      </Button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button variant="ghost" aria-label={t('classroom.index')} className="min-w-11 gap-2 px-2.5 lg:hidden">
            <ListTree aria-hidden="true" className="size-5" />
            <span className="hidden sm:inline">{t('classroom.index')}</span>
          </Button>
        </DialogTrigger>
        <DialogContent
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            if (navigated.current) event.preventDefault()
            navigated.current = false
          }}
          className="top-auto bottom-0 left-0 max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-2xl rounded-b-none bg-surface-muted"
        >
          <DialogTitle className="border-b border-ink pr-10 pb-2">
            <span className="font-read text-h4 text-ink">{t('classroom.index')}</span>
          </DialogTitle>
          <div className="mt-4">
            {index(() => {
              navigated.current = true
              onOpenChange(false)
            }, false)}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
