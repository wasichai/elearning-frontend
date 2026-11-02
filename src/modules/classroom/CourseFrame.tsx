import { LoadingState, PageHeader, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { BookOpen, CalendarCheck, ChevronRight, ClipboardCheck, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useParams } from 'react-router'
import { TEXT_LINK } from '../../shared/buttons'
import { formatNumber } from '../../shared/format'
import { ProblemState } from '../../shared/ProblemState'
import { Breadcrumbs, ScreenHeader } from '../../shared/Screen'
import { useClassroom, useSessions } from './api'
import type { Classroom } from './contract'
import { assessmentFigure, attendanceFigure, type Figure } from './lessons'
import { useProblemText } from './parts'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'

// el marco de una matrícula, común al aula, las sesiones y la finalización: lee el aula (ya en caché si se viene de otra pestaña),
// su cabecera con las secciones por URL y sus cifras. un 404 es siempre el mismo «no está en tus matrículas»

export function CourseQuery({ children }: { children: (classroom: Classroom) => ReactNode }) {
  const { t } = useTranslation('classroom')
  const { enrollmentId = '' } = useParams()
  const query = useClassroom(enrollmentId)
  if (query.isError) return <CourseProblem error={query.error} onRetry={() => void query.refetch()} />
  if (!query.data) return <LoadingState label={t('classroom.loading')} />
  return children(query.data)
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

// la ruta a «Mis cursos». su enlace mide 44 px en el móvil, como los demás enlaces de texto (TEXT_LINK); Breadcrumbs no lo fija
function CourseBreadcrumbs() {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  return (
    <div className="shrink-0 [&_a]:min-h-11 sm:[&_a]:min-h-6">
      <Breadcrumbs label={t('course.breadcrumbs')} items={[{ label: t('nav.myCourses'), to: links.to(CLASSROOM_ROUTES.enrollments) }]} />
    </div>
  )
}

const TAB_FOCUS = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus'
const TAB = `inline-flex min-h-11 shrink-0 items-center border-b-2 text-sm whitespace-nowrap ${TAB_FOCUS}`

// las secciones del curso: por URL, con desplazamiento propio si no caben. lessonId conserva la lección abierta: pulsar la pestaña en la que
// ya se está no salta a otra lección
function CourseTabs({ classroom, lessonId }: { classroom: Classroom; lessonId?: string }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const params = { enrollmentId: classroom.id }
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `${TAB} ${isActive ? 'border-brand font-medium text-ink' : 'border-transparent text-ink-muted hover:border-border-control hover:text-ink'}`
  return (
    <nav aria-label={t('course.sections')} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <div className="flex w-max gap-5">
        <NavLink to={links.to(CLASSROOM_ROUTES.classroom, params, lessonId ? { [LESSON_PARAM]: lessonId } : undefined)} end className={tabClass}>
          {t('classroom.showUnits')}
        </NavLink>
        <NavLink to={links.to(CLASSROOM_ROUTES.sessions, params)} className={tabClass}>
          {t('course.tabSessions')}
        </NavLink>
        <NavLink to={links.to(CLASSROOM_ROUTES.completion, params)} className={tabClass}>
          {classroom.certificateCode ? t('completionPanel.titleIssued') : t('course.tabCompletion')}
        </NavLink>
      </div>
    </nav>
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
          <div className="flex min-h-11 min-w-0 items-center gap-1 text-sm">
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
