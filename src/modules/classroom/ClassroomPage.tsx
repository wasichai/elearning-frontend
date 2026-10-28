import { LoadingState, PageHeader, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button } from '@wasichai/ui'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router'
import { ProblemState } from '../../shared/ProblemState'
import { useClassroom } from './api'
import type { Classroom } from './contract'
import { defaultLesson, lessonPath, neighbours, orderedUnits } from './lessons'
import { LessonView } from './LessonView'
import { OfferingDates, useProblemText } from './parts'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'
import { UnitNav } from './UnitNav'

// el aula de una matrícula
export function ClassroomPage() {
  const { t } = useTranslation('classroom')
  const { enrollmentId = '' } = useParams()
  const query = useClassroom(enrollmentId)
  if (query.isError) return <ClassroomProblem error={query.error} onRetry={() => void query.refetch()} />
  if (!query.data) return <LoadingState label={t('classroom.loading')} />
  return <ClassroomView classroom={query.data} />
}

function BackToMyCourses() {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  return (
    <Link to={links.to(CLASSROOM_ROUTES.enrollments)} className="text-sm text-link underline-offset-4 hover:underline">
      {t('classroom.back')}
    </Link>
  )
}

function ClassroomProblem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('classroom')
  const { kind, title, description } = useProblemText(error, 'classroom')
  // un 404 es una respuesta, no un fallo: la matrícula no existe o es de otra persona (el servidor no distingue)
  if (kind === 'notFound')
    return (
      <>
        <PageHeader title={t('classroom.notFound')} subtitle={t('classroom.notFoundHint')} />
        <div className="px-4 py-6 sm:px-8">
          <BackToMyCourses />
        </div>
      </>
    )
  return (
    <div className="px-4 sm:px-8">
      <ProblemState title={title} description={description}>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('problem.retry')}
        </Button>
        <BackToMyCourses />
      </ProblemState>
    </div>
  )
}

// las páginas de la matrícula que no son lecciones: sus sesiones en vivo y la finalización con el certificado
function CourseLinks({ classroom }: { classroom: Classroom }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const params = { enrollmentId: classroom.id }
  const linkClass = 'text-sm text-link underline-offset-4 hover:underline'
  return (
    <nav aria-label={t('classroom.more')} className="flex flex-col gap-1.5 border-t border-border pt-4">
      <Link to={links.to(CLASSROOM_ROUTES.sessions, params)} className={linkClass}>
        {t('sessions.title')}
      </Link>
      <Link to={links.to(CLASSROOM_ROUTES.completion, params)} className={linkClass}>
        {classroom.certificateCode ? t('completionPanel.titleIssued') : t('completionPanel.title')}
      </Link>
    </nav>
  )
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
  return (
    <>
      <PageHeader title={classroom.course.title} />
      <div className="px-4 pb-16 sm:px-8 lg:flex lg:items-start lg:gap-12">
        {/* el panel lateral se queda a la vista mientras se lee (sticky dentro del área que desplaza el shell) */}
        <aside className="flex flex-col gap-4 pt-6 lg:sticky lg:top-0 lg:max-h-screen lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:pb-6">
          <div className="flex flex-col gap-1">
            <BackToMyCourses />
            <OfferingDates offering={classroom.offering} />
          </div>
          <UnitNav classroom={classroom} units={units} currentLessonId={placed?.lesson.id} />
          <CourseLinks classroom={classroom} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-4 pt-6">
          {requested && !found ? <Alert tone="notice">{t('classroom.lessonMissing')}</Alert> : null}
          {classroom.status === 'FINALIZADA' ? <Alert tone="notice">{t('classroom.finished')}</Alert> : null}
          {placed ? (
            <LessonView enrollmentId={classroom.id} timeZone={classroom.offering.timeZone} placed={placed} previous={previous} next={next} pending={pending} />
          ) : (
            <p className="text-sm text-ink-muted">{t('classroom.empty')}</p>
          )}
        </div>
      </div>
    </>
  )
}
