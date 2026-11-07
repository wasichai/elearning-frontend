import { PageHeader, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { BookOpen, CalendarCheck, ChevronRight, ClipboardCheck, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { TEXT_LINK } from '../../shared/buttons'
import { formatNumber } from '../../shared/format'
import { ProblemState } from '../../shared/ProblemState'
import { Breadcrumbs, ScreenHeader, SectionTabs, Skeleton } from '../../shared/Screen'
import { useClassroom, useSessions } from './api'
import type { Classroom } from './contract'
import { assessmentFigure, attendanceFigure, type Figure } from './lessons'
import { LESSON_COLUMN, useProblemText } from './parts'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'

// el marco de una matrícula, común al aula, las sesiones y la finalización: lee el aula (ya en caché si se viene de otra pestaña),
// su cabecera con las secciones por URL y sus cifras. un 404 es siempre el mismo «no está en tus matrículas»

export function CourseQuery({ children }: { children: (classroom: Classroom) => ReactNode }) {
  const { t } = useTranslation('classroom')
  const { enrollmentId = '' } = useParams()
  const query = useClassroom(enrollmentId)
  if (query.isError) return <CourseProblem error={query.error} onRetry={() => void query.refetch()} />
  if (!query.data) return <CourseSkeleton label={t('classroom.loading')} />
  return children(query.data)
}

// la forma del aula mientras llega (cabecera con sus pestañas, temario y lección), con el aviso para lectores de pantalla
function CourseSkeleton({ label }: { label: string }) {
  return (
    <div role="status" data-slot="classroom-skeleton" className="flex min-h-full flex-col">
      <span className="sr-only">{label}</span>
      <div className="flex flex-col gap-3 border-b border-border px-4 pt-6 pb-3 sm:px-6 lg:px-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-3/5 max-w-xl" />
        <div className="flex gap-6 pt-3">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="hidden flex-col gap-4 border-r border-border bg-surface p-5 lg:flex lg:pl-8">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-4 w-2/3" />
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-3 pt-2">
              <Skeleton className="size-4 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
        <div className={`${LESSON_COLUMN} flex flex-col gap-4 py-8`}>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-2 h-48 w-full" />
        </div>
      </div>
    </div>
  )
}

function CourseProblem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const { kind, title, description } = useProblemText(error, 'classroom')
  const back = (
    <Link to={links.to(CLASSROOM_ROUTES.enrollments)} className={TEXT_LINK}>
      {t('classroom.back')}
    </Link>
  )
  // un 404 es una respuesta, no un fallo: la matrícula no existe o es de otra persona (el servidor no distingue)
  if (kind === 'notFound')
    return (
      <>
        <PageHeader title={t('classroom.notFound')} subtitle={t('classroom.notFoundHint')} />
        <div className="px-4 py-6 sm:px-8">{back}</div>
      </>
    )
  return (
    <div className="px-4 sm:px-8">
      <ProblemState title={title} description={description}>
        <Button variant="secondary" onClick={onRetry}>
          {t('problem.retry')}
        </Button>
        {back}
      </ProblemState>
    </div>
  )
}

function CourseBreadcrumbs() {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  return <Breadcrumbs label={t('course.breadcrumbs')} items={[{ label: t('nav.myCourses'), to: links.to(CLASSROOM_ROUTES.enrollments) }]} />
}

// las secciones del curso. lessonId conserva la lección abierta: pulsar la pestaña en la que ya se está no salta a otra lección
function CourseTabs({ classroom, lessonId }: { classroom: Classroom; lessonId?: string }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const params = { enrollmentId: classroom.id }
  return (
    <SectionTabs
      label={t('course.sections')}
      items={[
        { label: t('course.tabLessons'), to: links.to(CLASSROOM_ROUTES.classroom, params, lessonId ? { [LESSON_PARAM]: lessonId } : undefined), end: true },
        { label: t('course.tabSessions'), to: links.to(CLASSROOM_ROUTES.sessions, params) },
        { label: classroom.certificateCode ? t('completionPanel.titleIssued') : t('course.tabCompletion'), to: links.to(CLASSROOM_ROUTES.completion, params) }
      ]}
    />
  )
}

// con una lección abierta la cabecera es mínima: la lectura empieza en la primera mitad de la pantalla a 390 px, y las cifras
// esperan en el panel del temario. sin lección (las otras secciones, un curso vacío) la cabecera las dice
export function CourseHeader({ classroom, lessonId }: { classroom: Classroom; lessonId?: string }) {
  if (lessonId)
    return (
      <header className="border-b border-border bg-surface">
        {/* a ras del panel del temario, que empieza en el borde de la página: a cualquier ancho comparten margen */}
        <div className="flex flex-col px-4 sm:px-6 sm:pt-1 lg:px-8">
          <div className="flex min-h-11 min-w-0 items-center gap-1 text-sm [&>nav]:shrink-0">
            <CourseBreadcrumbs />
            <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-ink-muted" />
            <h1 className="min-w-0 truncate text-sm font-semibold text-ink">{classroom.course.title}</h1>
          </div>
          <CourseTabs classroom={classroom} lessonId={lessonId} />
        </div>
      </header>
    )
  return (
    <ScreenHeader width="wide" breadcrumbs={<CourseBreadcrumbs />} title={classroom.course.title} meta={<CourseFigures classroom={classroom} />}>
      <CourseTabs classroom={classroom} />
    </ScreenHeader>
  )
}

// el avance con cifras reales. lessons={false} cuando las lecciones ya se dicen al lado (el cordón del temario). la asistencia solo si las
// sesiones llegaron: sin ellas no hay dato exacto, y quien mira no necesita un error por una cifra de resumen
export function CourseFigures({ classroom, lessons = true, stacked = false }: { classroom: Classroom; lessons?: boolean; stacked?: boolean }) {
  const { t, i18n } = useTranslation('classroom')
  const { data: sessions } = useSessions(classroom.id)
  const { completedLessons, totalLessons } = classroom.progress
  const assessments = assessmentFigure(classroom.units)
  const attendance = sessions ? attendanceFigure(sessions) : undefined
  const items: { key: string; icon: LucideIcon; figure?: Figure; label: (count: number) => string }[] = [
    ...(lessons
      ? [
          {
            key: 'lessons',
            icon: BookOpen,
            figure: { completed: completedLessons, total: totalLessons },
            label: (count: number) => t('course.figureLessons', { count })
          }
        ]
      : []),
    { key: 'assessments', icon: ClipboardCheck, figure: assessments, label: (count: number) => t('course.figureAssessments', { count }) },
    { key: 'attendance', icon: CalendarCheck, figure: attendance, label: (count: number) => t('course.figureAttendance', { count }) }
  ]
  const shown = items.filter((item) => item.figure && item.figure.total > 0)
  if (shown.length === 0) return null
  return (
    <ul aria-label={t('course.figures')} className={`flex text-sm text-ink-muted ${stacked ? 'flex-col gap-1' : 'flex-wrap gap-x-5 gap-y-1'}`}>
      {shown.map(({ key, icon: Icon, figure, label }) => (
        <li key={key} className="flex items-center gap-1.5">
          <Icon aria-hidden="true" className="size-4 shrink-0" />
          <span>
            <span className="font-medium text-ink tabular-nums">
              {t('classroom.unitProgress', { completed: formatNumber(figure!.completed, i18n.language), total: formatNumber(figure!.total, i18n.language) })}
            </span>{' '}
            <span>{label(figure!.total)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
