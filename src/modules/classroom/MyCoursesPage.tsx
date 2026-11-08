import { EmptyState, useAuth, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useId, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { BookOpen } from 'lucide-react'
import { formatNumber, timeZoneLabel } from '../../shared/format'
import { ProblemState } from '../../shared/ProblemState'
import { useRefetchOnRevisit } from '../../shared/revisit'
import { ScreenBody, Section, Skeleton } from '../../shared/Screen'
import { SegmentedProgress } from '../../shared/SegmentedProgress'
import { StateMark } from '../../shared/StateMark'
import { useAgenda } from './agenda'
import { useClassroom, useClassroomPanel, useEnrollments } from './api'
import type { Enrollment, ProgressSummary } from './contract'
import {
  allLessonsDone,
  canContinue,
  groupEnrollments,
  liveSessions,
  railAssessments,
  railEnrollments,
  weekRange,
  weekSessions,
  type EnrollmentGroups
} from './dashboard'
import { DashboardRail } from './DashboardRail'
import { OfferingDates, useProblemText, WRAP } from './parts'
import { CATALOG_COURSES_ROUTE, CLASSROOM_ROUTES, LESSON_PARAM } from './routes'
import { StatusBadge } from './StatusBadge'
import { progressUnits } from './UnitNav'

const NO_ENROLLMENTS: Enrollment[] = []

// «Mis cursos», el panel del estudiante (docs/design-system/colofon/Dashboard.dc.html): el saludo con lo que tiene por delante, «Continuar»
// (la única superficie blanca), el resto de sus cursos como lista con filetes y, al lado, la semana y lo que queda por hacer.
// tres lecturas: el panel (las matrículas y sus evaluaciones pendientes), la agenda de los próximos 7 días y el aula de la matrícula
// de «Continuar», por los estados de sus lecciones. si el panel falla solo se piden las matrículas: los cursos siguen a la vista y
// «Por hacer» dice que no pudo, sin datos a medias. solo si tampoco llegan, la pantalla entera explica el problema
export function MyCoursesPage() {
  const panel = useClassroomPanel()
  const list = useEnrollments({ enabled: panel.isError })
  // el intervalo, una vez por visita: redondeado al día, no cambia la clave de la consulta en cada render
  const [range] = useState(() => weekRange(Date.now()))
  const agenda = useAgenda(range)
  const read = panel.isError ? undefined : panel.data
  const enrollments = read ?? list.data
  const groups = useMemo(() => groupEnrollments(enrollments ?? NO_ENROLLMENTS), [enrollments])
  const active = useMemo(() => railEnrollments(groups), [groups])
  const reload = () => {
    void panel.refetch()
    void agenda.refetch()
    if (panel.isError) void list.refetch()
  }
  useRefetchOnRevisit(reload)
  const now = Date.now()
  const week = agenda.data ? weekSessions(agenda.data, active, now) : []
  const assessments = read ? railAssessments(active, read) : []
  const zone = sharedZone(enrollments ?? NO_ENROLLMENTS)
  const context = {
    hasCourses: Boolean(enrollments?.length),
    // las cifras, solo si se leyeron enteras: si no, no serían exactas
    sessions: agenda.data && enrollments ? liveSessions(week).length : undefined,
    assessments: read ? assessments.length : undefined
  }
  return (
    <ScreenBody className="gap-9">
      <Greeting zone={zone} now={now} {...context} />
      {panel.isError && list.isError ? (
        <EnrollmentsProblem error={list.error} onRetry={reload} />
      ) : enrollments ? (
        enrollments.length === 0 ? (
          <NoEnrollments />
        ) : (
          <Dashboard
            groups={groups}
            zone={zone}
            rail={
              active.length > 0 ? (
                <DashboardRail
                  week={{ items: week, loading: agenda.isPending, failed: agenda.isError, retry: () => void agenda.refetch() }}
                  assessments={{ items: assessments, loading: panel.isPending, failed: panel.isError, retry: () => void panel.refetch() }}
                  pageZone={zone}
                  now={now}
                />
              ) : null
            }
          />
        )
      ) : (
        <DashboardSkeleton />
      )}
    </ScreenBody>
  )
}

// la cabecera: «Mis cursos» y la fecha de hoy sobre el filete de tinta; debajo, el saludo con su nombre y una línea con lo que tiene en
// los próximos 7 días, contado de forma exacta (sin la lectura, no se dice)
function Greeting({
  zone,
  now,
  hasCourses,
  sessions,
  assessments
}: {
  zone?: string
  now: number
  hasCourses: boolean
  sessions?: number
  assessments?: number
}) {
  const { t, i18n } = useTranslation('classroom')
  const name = useAuth().user?.displayName
  const today = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: zone }).format(now)
  const facts = [sessions ? t('dashboard.week', { count: sessions }) : null, assessments ? t('dashboard.pending', { count: assessments }) : null].filter(
    Boolean
  )
  const line = !hasCourses ? null : facts.length > 0 ? facts.join(' ') : t('enrollments.subtitle')
  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ink pb-2">
        <h1 className="meta text-ink">{t('enrollments.title')}</h1>
        <p className="meta flex flex-col sm:flex-row sm:gap-x-2">
          <span>{today}</span>
          {zone ? (
            <>
              <span aria-hidden="true" className="max-sm:hidden">
                ·
              </span>
              <span>{t('dashboard.timeZone', { zone: timeZoneLabel(zone, i18n.language) })}</span>
            </>
          ) : null}
        </p>
      </div>
      {name ? <p className="font-read text-h1 mt-3 text-balance text-ink max-sm:text-h2">{t('dashboard.greeting', { name })}</p> : null}
      {line ? <p className="font-read text-reading max-w-measure text-ink max-sm:text-body">{line}</p> : null}
    </header>
  )
}

function EnrollmentsProblem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('classroom')
  const { title, description, technical } = useProblemText(error, 'enrollments')
  return (
    <ProblemState title={title} description={description} technical={technical}>
      <Button variant="secondary" onClick={onRetry}>
        {t('problem.retry')}
      </Button>
    </ProblemState>
  )
}

function NoEnrollments() {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  return (
    <EmptyState title={t('enrollments.empty')} icon={BookOpen}>
      <p>{t('enrollments.emptyHint')}</p>
      {/* el catálogo es otro módulo: se enlaza por su clave de ruta, sin importarlo, y solo si está registrado */}
      {links.has(CATALOG_COURSES_ROUTE) ? (
        <Button asChild className="mt-2 min-h-11">
          <Link to={links.to(CATALOG_COURSES_ROUTE)}>{t('enrollments.toCatalog')}</Link>
        </Button>
      ) : null}
    </EmptyState>
  )
}

// la geometría del panel mientras llega, con el aviso para lectores de pantalla
function DashboardSkeleton() {
  const { t } = useTranslation('classroom')
  return (
    <div role="status" className={PANEL}>
      <span className="sr-only">{t('enrollments.loading')}</span>
      <div className="flex flex-col gap-4 border-t-2 border-brand bg-surface p-6">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-11 w-full sm:w-32" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  )
}

// una columna hasta xl (con «Continuar» primero y la columna lateral debajo); desde xl, las dos mitades del artboard
const PANEL = 'grid grid-cols-1 items-start gap-12 xl:grid-cols-2'

function Dashboard({ groups, zone, rail }: { groups: EnrollmentGroups; zone?: string; rail: ReactNode }) {
  const { t } = useTranslation('classroom')
  const { primary, inProgress, completed, withdrawn } = groups
  const showZone = zone === undefined
  return (
    // sin columna lateral, la lista conserva su medida: no se estira a todo el ancho
    <div className={PANEL}>
      <div className="flex min-w-0 flex-col gap-10">
        {primary ? <PrimaryCourse enrollment={primary} showZone={showZone} /> : null}
        <CourseSection title={primary ? t('dashboard.otherInProgress') : t('dashboard.inProgress')} enrollments={inProgress} showZone={showZone} />
        <CourseSection title={t('dashboard.completed')} enrollments={completed} showZone={showZone} />
        <CourseSection title={t('dashboard.withdrawn')} enrollments={withdrawn} showZone={showZone} />
      </div>
      {rail}
    </div>
  )
}

// la zona de todas las ediciones, si es una sola: entonces se dice una vez por página y no en cada fila
function sharedZone(enrollments: Enrollment[]): string | undefined {
  const zones = new Set(enrollments.map((enrollment) => enrollment.offering.timeZone))
  return zones.size === 1 ? [...zones][0] : undefined
}

const ACTION_LINK = 'text-label inline-flex min-h-11 items-center rounded-sm text-link underline-offset-4 hover:underline'

// el avance cuando no se tiene el estado de cada lección (el resumen de la matrícula): una barra continua y la cuenta. no se pintan
// segmentos: cuáles están hechos no se sabe, y dibujarlos lo inventaría
function CourseMeter({ progress, className = '' }: { progress: ProgressSummary; className?: string }) {
  const { t, i18n } = useTranslation('classroom')
  const values = {
    completed: formatNumber(progress.completedLessons, i18n.language),
    total: formatNumber(progress.totalLessons, i18n.language),
    percent: formatNumber(progress.percent, i18n.language)
  }
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span aria-hidden="true" className="text-label text-ink tabular-nums">
        {t('progress.count', values)}
      </span>
      <div
        role="progressbar"
        aria-label={t('progress.course')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-valuetext={t('progress.valueText', values)}
        className="box-border h-2 w-full border border-border-control"
      >
        <div className="h-full bg-ink" style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  )
}

// «Continuar»: la única superficie blanca de la pantalla, con la lección exacta y la única primaria. el progreso, por lección, sale
// del aula de esta matrícula (una lectura más, y la misma caché que abre el aula al pulsar); mientras llega o si falla, el resumen
function PrimaryCourse({ enrollment, showZone }: { enrollment: Enrollment; showZone: boolean }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const titleId = useId()
  const classroom = useClassroom(enrollment.id)
  const next = enrollment.nextLesson!
  const course = enrollment.course.title
  return (
    <section aria-labelledby={titleId} className="border-t-2 border-brand bg-surface">
      <article className="flex flex-col gap-3 px-4 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6">
        <div className="meta flex flex-wrap gap-x-2">
          <h2 id={titleId}>{t('dashboard.continue')}</h2>
          <span aria-hidden="true">·</span>
          <h3 className="min-w-0 break-words">
            {/* el curso abre su aula, como en la lista; la lección exacta la abre la primaria */}
            <Link
              to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId: enrollment.id })}
              className="rounded-sm text-ink-muted no-underline underline-offset-4 hover:text-ink hover:underline"
            >
              {course}
            </Link>
          </h3>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-secondary text-ink-muted">
            {t('classroom.unitShort', { order: next.unitOrder })} · {t('classroom.section', { unit: next.unitOrder, lesson: next.lessonOrder })}
          </p>
          <p className="font-read text-h3 text-balance break-words text-ink">{next.title}</p>
        </div>
        <div className="max-w-[26rem]">
          {classroom.data ? (
            <SegmentedProgress units={progressUnits(classroom.data.units)} currentLessonId={next.id} />
          ) : (
            <CourseMeter progress={enrollment.progress} />
          )}
        </div>
        <OfferingDates offering={enrollment.offering} showZone={showZone} />
        <Button asChild className={`${WRAP} mt-1 min-h-11 w-full px-6 sm:w-auto sm:self-start`}>
          <Link
            to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId: enrollment.id }, { [LESSON_PARAM]: next.id })}
            aria-label={t('enrollments.continueLabel', { course })}
          >
            {t('enrollments.continue')}
          </Link>
        </Button>
      </article>
    </section>
  )
}

function CourseSection({ title, enrollments, showZone }: { title: string; enrollments: Enrollment[]; showZone: boolean }) {
  if (enrollments.length === 0) return null
  return (
    <Section title={title}>
      <ul className="-mt-3 flex flex-col divide-y divide-border border-b border-border">
        {enrollments.map((enrollment) => (
          <li key={enrollment.id}>
            <CourseRow enrollment={enrollment} showZone={showZone} />
          </li>
        ))}
      </ul>
    </Section>
  )
}

function statusLine(enrollment: Enrollment): 'next' | 'finished' | 'closed' | 'noLessons' | 'withdrawn' | 'certified' {
  if (enrollment.status === 'RETIRADA') return 'withdrawn'
  if (enrollment.certificateCode) return 'certified'
  if (canContinue(enrollment)) return 'next'
  if (allLessonsDone(enrollment)) return 'finished'
  return enrollment.status === 'FINALIZADA' ? 'closed' : 'noLessons'
}

// un curso que no es el de «Continuar»: una fila entre filetes. a la izquierda el título (Newsreader), sus fechas y su estado; a la
// derecha, su avance y su acción, un enlace y no un botón. con certificado, el avance cede el sitio al estado y al certificado
function CourseRow({ enrollment, showZone }: { enrollment: Enrollment; showZone: boolean }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const titleId = useId()
  const params = { enrollmentId: enrollment.id }
  const course = enrollment.course.title
  const line = statusLine(enrollment)
  const code = enrollment.certificateCode
  return (
    <article aria-labelledby={titleId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-2 py-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 id={titleId} className="font-read text-h4 break-words">
          {/* una matrícula retirada ya no tiene aula (404): su título no enlaza a ningún sitio */}
          {line === 'withdrawn' ? (
            <span className="text-ink">{course}</span>
          ) : (
            <Link
              to={links.to(CLASSROOM_ROUTES.classroom, params)}
              className="rounded-sm text-ink no-underline underline-offset-4 hover:text-brand-strong hover:underline"
            >
              {course}
            </Link>
          )}
        </h3>
        <OfferingDates offering={enrollment.offering} showZone={showZone} />
        {line === 'withdrawn' ? (
          <p className="mt-1 flex">
            <StatusBadge state="neutral">{t('dashboard.withdrawnBadge')}</StatusBadge>
          </p>
        ) : line === 'certified' ? (
          <p className="text-secondary flex flex-wrap items-center gap-x-2 text-ink-muted">
            <span>
              {t('dashboard.certificate')} <span className="font-semibold tracking-wide text-ink">{code}</span>
            </span>
            <span aria-hidden="true">·</span>
            <Link
              to={links.to(CLASSROOM_ROUTES.certificate, { code: code! })}
              aria-label={t('enrollments.certificate', { course })}
              className="inline-flex min-h-11 items-center rounded-sm text-link underline underline-offset-4"
            >
              {t('dashboard.viewCertificate')}
            </Link>
          </p>
        ) : (
          <p className="text-secondary break-words text-ink">
            {line === 'next'
              ? t('enrollments.next', { lesson: enrollment.nextLesson!.title })
              : line === 'finished'
                ? t('enrollments.finished')
                : t(line === 'closed' ? 'dashboard.closed' : 'dashboard.noLessons')}
          </p>
        )}
      </div>
      {line === 'certified' ? (
        <p className="text-secondary inline-flex items-center gap-1.5 self-start pt-1 font-semibold text-success">
          <StateMark state="passed" />
          {t('enrollments.certified')}
        </p>
      ) : line === 'withdrawn' ? null : (
        <div className="flex w-30 flex-col items-end gap-0.5">
          <CourseMeter progress={enrollment.progress} className="w-full items-end" />
          {line === 'next' ? (
            <Link
              to={links.to(CLASSROOM_ROUTES.classroom, params, { [LESSON_PARAM]: enrollment.nextLesson!.id })}
              aria-label={t('enrollments.continueLabel', { course })}
              className={ACTION_LINK}
            >
              {t('enrollments.continue')}
            </Link>
          ) : line === 'finished' || line === 'closed' ? (
            <Link to={links.to(CLASSROOM_ROUTES.classroom, params)} aria-label={t('enrollments.reviewLabel', { course })} className={ACTION_LINK}>
              {t('enrollments.review')}
            </Link>
          ) : null}
        </div>
      )}
    </article>
  )
}
