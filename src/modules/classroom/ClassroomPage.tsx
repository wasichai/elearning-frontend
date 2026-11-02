import { EmptyState } from '@wasichai/core'
import { Alert, Button, Dialog, DialogContent, DialogTitle, DialogTrigger } from '@wasichai/ui'
import { BookOpen, ListTree, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import type { Classroom } from './contract'
import { CourseHeader, CourseQuery } from './CourseFrame'
import { defaultLesson, lessonPath, neighbours, orderedUnits } from './lessons'
import { LessonView } from './LessonView'
import { LESSON_COLUMN, OfferingDates } from './parts'
import { useReadingPreferences, type ReadingControls } from './readingPreferences'
import { LESSON_PARAM } from './routes'
import { UnitNav } from './UnitNav'

// el aula de una matrícula
export function ClassroomPage() {
  return <CourseQuery>{(classroom) => <ClassroomView classroom={classroom} />}</CourseQuery>
}

function ClassroomView({ classroom }: { classroom: Classroom }) {
  const { t } = useTranslation('classroom')
  const [params] = useSearchParams()
  const units = useMemo(() => orderedUnits(classroom), [classroom])
  const path = useMemo(() => lessonPath(units), [units])
  const requested = params.get(LESSON_PARAM)
  const found = requested ? path.find((placed) => placed.lesson.id === requested) : undefined
  const placed = found ?? defaultLesson(path, classroom.nextLesson?.id)
  const { previous, next } = placed ? neighbours(path, placed.lesson.id) : {}
  const pending = path.find((candidate) => candidate.lesson.id === classroom.nextLesson?.id)
  const reading = useReadingPreferences()
  const [sheetOpen, setSheetOpen] = useState(false)
  const syllabus = (onNavigate?: () => void) => <UnitNav classroom={classroom} units={units} currentLessonId={placed?.lesson.id} onNavigate={onNavigate} />
  const hasPanel = placed !== undefined && !reading.syllabusHidden
  return (
    <div className="flex min-h-full flex-col">
      <CourseHeader classroom={classroom} lessonId={placed?.lesson.id} />
      <div className={`grid flex-1 grid-cols-1 ${hasPanel ? 'lg:grid-cols-[20rem_minmax(0,1fr)]' : ''}`}>
        {/* el panel se queda a la vista mientras se lee (sticky dentro del área que desplaza el shell). con la hoja abierta no
            se pinta: el temario está una sola vez en la página */}
        {!sheetOpen && hasPanel ? (
          <aside className="hidden border-r border-border bg-surface lg:block">
            <div className="sticky top-0 max-h-dvh overflow-y-auto p-5 lg:pl-8">{syllabus()}</div>
          </aside>
        ) : null}
        <div className="flex min-w-0 flex-col">
          {requested && !found ? (
            <div className={`${LESSON_COLUMN} pt-4`}>
              <Alert tone="notice">{t('classroom.lessonMissing')}</Alert>
            </div>
          ) : null}
          {classroom.status === 'FINALIZADA' ? (
            <div className={`${LESSON_COLUMN} pt-4`}>
              <Alert tone="notice">{t('classroom.finished')}</Alert>
            </div>
          ) : null}
          {placed ? (
            <div className="flex-1">
              <LessonView
                enrollmentId={classroom.id}
                timeZone={classroom.offering.timeZone}
                placed={placed}
                previous={previous}
                next={next}
                pending={pending}
                readingControls={reading}
                syllabusControls={<SyllabusControls reading={reading} open={sheetOpen} onOpenChange={setSheetOpen} syllabus={syllabus} />}
              />
            </div>
          ) : (
            <div className={`${LESSON_COLUMN} py-8`}>
              <EmptyState title={t('classroom.empty')} icon={BookOpen}>
                <p>{t('classroom.emptyHint')}</p>
                <div className="[&>p]:justify-center">
                  <OfferingDates offering={classroom.offering} />
                </div>
              </EmptyState>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// el temario se abre en una hoja inferior en el móvil y se pliega en escritorio. la hoja atrapa el foco, se cierra con Esc o
// tocando el velo y lo devuelve al botón; si se cerró eligiendo una lección, el foco es de su título (LessonView)
function SyllabusControls({
  reading,
  open,
  onOpenChange,
  syllabus
}: {
  reading: ReadingControls
  open: boolean
  onOpenChange: (open: boolean) => void
  syllabus: (onNavigate?: () => void) => ReactNode
}) {
  const { t } = useTranslation('classroom')
  const navigated = useRef(false)
  const Collapse = reading.syllabusHidden ? PanelLeftOpen : PanelLeftClose
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-expanded={!reading.syllabusHidden}
        aria-label={reading.syllabusHidden ? t('classroom.expandUnits') : t('classroom.collapseUnits')}
        onClick={reading.toggleSyllabus}
        className="hidden lg:inline-flex"
      >
        <Collapse aria-hidden="true" className="size-5" />
      </Button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button variant="secondary" className="gap-2 px-3 lg:hidden">
            <ListTree aria-hidden="true" className="size-5" />
            {t('classroom.showUnits')}
          </Button>
        </DialogTrigger>
        <DialogContent
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            if (navigated.current) event.preventDefault()
            navigated.current = false
          }}
          className="top-auto bottom-0 left-0 max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-2xl rounded-b-none"
        >
          <DialogTitle className="pr-10 text-title-3 text-ink">{t('classroom.showUnits')}</DialogTitle>
          <div className="mt-4">
            {syllabus(() => {
              navigated.current = true
              onOpenChange(false)
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
