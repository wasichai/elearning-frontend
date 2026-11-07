import { EmptyState, useAuth, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { BookOpen } from 'lucide-react'
import { CordBanner } from '../../shared/CordBanner'
import { timeZoneLabel } from '../../shared/format'
import { ProblemState } from '../../shared/ProblemState'
import { useRefetchOnRevisit } from '../../shared/revisit'
import { ScreenBody, ScreenHeader, Section, Skeleton } from '../../shared/Screen'
import { useClassroomPanel, useEnrollments } from './api'
import type { Enrollment } from './contract'
import { allLessonsDone, canContinue, groupEnrollments, railEnrollments, type EnrollmentGroups } from './dashboard'
import { DashboardRail, railData, type RailData } from './DashboardRail'
import { OfferingDates, ProgressBar, useProblemText, WRAP } from './parts'
import { summaryKnots } from './Quipu'
import { CATALOG_COURSES_ROUTE, CLASSROOM_ROUTES, LESSON_PARAM } from './routes'
import { StatusBadge } from './StatusBadge'

const NO_ENROLLMENTS: Enrollment[] = []

// «Mis cursos», el panel del estudiante: arriba por dónde seguir, debajo el resto de sus cursos y al lado lo que tiene por
// delante. todo sale de una sola lectura, el panel, que ya trae las matrículas. si falla, solo se piden las matrículas: los cursos siguen
// a la vista y el riel dice que no pudo, sin datos a medias. solo si tampoco llegan, la pantalla entera explica el problema
export function MyCoursesPage() {
  const { t } = useTranslation('classroom')
  const panel = useClassroomPanel()
  const list = useEnrollments({ enabled: panel.isError })
  const read = panel.isError ? undefined : panel.data
  const enrollments = read ?? list.data
  const groups = useMemo(() => groupEnrollments(enrollments ?? NO_ENROLLMENTS), [enrollments])
  const active = useMemo(() => railEnrollments(groups), [groups])
  const reload = () => {
    void panel.refetch()
    if (panel.isError) void list.refetch()
  }
  useRefetchOnRevisit(reload)
  const rail = railData(active, read, { loading: panel.isPending, failed: panel.isError, retry: () => void panel.refetch() })
  return (
    <>
      <ScreenHeader title={t('enrollments.title')} subtitle={<Greeting hasCourses={Boolean(enrollments?.length)} sessionsThisWeek={rail.sessionsThisWeek} />} />
      <ScreenBody>
        {panel.isError && list.isError ? (
          <EnrollmentsProblem error={list.error} onRetry={reload} />
        ) : enrollments ? (
          enrollments.length === 0 ? (
            <NoEnrollments />
          ) : (
            <Dashboard groups={groups} total={enrollments.length} railData={rail} railCount={active.length} />
          )
        ) : (
          <DashboardSkeleton />
        )}
      </ScreenBody>
    </>
  )
}

// el saludo con su nombre y, si se sabe con exactitud, lo que tiene en los próximos 7 días
function Greeting({ hasCourses, sessionsThisWeek }: { hasCourses: boolean; sessionsThisWeek?: number }) {
  const { t } = useTranslation('classroom')
  const name = useAuth().user?.displayName
  const parts = [
    name ? t('dashboard.greeting', { name }) : null,
    !hasCourses ? null : sessionsThisWeek ? t('dashboard.week', { count: sessionsThisWeek }) : t('enrollments.subtitle')
  ]
  return <>{parts.filter(Boolean).join(' ')}</>
}

function EnrollmentsProblem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('classroom')
  const { title, description } = useProblemText(error, 'enrollments')
  return (
    <ProblemState title={title} description={description}>
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
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-56" />
        <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-11 w-full sm:w-32" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  )
}

// una columna en el móvil (con «Continuar» primero y el riel debajo); cuerpo y riel desde lg
const PANEL = 'grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10'

function Dashboard({ groups, total, railData, railCount }: { groups: EnrollmentGroups; total: number; railData: RailData; railCount: number }) {
  const { t } = useTranslation('classroom')
  const { primary, inProgress, completed, withdrawn } = groups
  // con un solo curso las cifras no dicen nada que no se vea; y sin cifras ni nada que leer, el riel sobra
  const figures = total > 1 ? { inProgress: inProgress.length + (primary ? 1 : 0), completed: completed.length } : undefined
  const hasRail = figures !== undefined || railCount > 0
  const zone = sharedZone([...(primary ? [primary] : []), ...inProgress, ...completed, ...withdrawn])
  const showZone = zone === undefined
  return (
    <div className={hasRail ? PANEL : 'flex flex-col'}>
      <div className="flex min-w-0 flex-col gap-10">
        {primary ? (
          <Section title={t('dashboard.continue')}>
            <PrimaryCourse enrollment={primary} showZone={showZone} />
          </Section>
        ) : null}
        <CourseSection title={primary ? t('dashboard.otherInProgress') : t('dashboard.inProgress')} enrollments={inProgress} showZone={showZone} />
        <CourseSection title={t('dashboard.completed')} enrollments={completed} showZone={showZone} />
        <CourseSection title={t('dashboard.withdrawn')} enrollments={withdrawn} showZone={showZone} />
        {zone ? <ZoneNote zone={zone} /> : null}
      </div>
      {hasRail ? <DashboardRail data={railData} showBlocks={railCount > 0} figures={figures} pageZone={zone} /> : null}
    </div>
  )
}

// la zona de todas las ediciones, si es una sola: entonces se dice una vez por página y no en cada tarjeta
function sharedZone(enrollments: Enrollment[]): string | undefined {
  const zones = new Set(enrollments.map((enrollment) => enrollment.offering.timeZone))
  return zones.size === 1 ? [...zones][0] : undefined
}

function ZoneNote({ zone }: { zone: string }) {
  const { t, i18n } = useTranslation('classroom')
  return <p className="text-xs text-ink-muted">{t('dashboard.timeZone', { zone: timeZoneLabel(zone, i18n.language) })}</p>
}

const COURSE_LINK = 'inline-flex min-h-11 items-center rounded-sm text-ink underline-offset-4 hover:text-brand-strong hover:underline'
const ACTION_LINK = 'inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-link underline-offset-4 hover:underline'

function CourseTitle({ enrollment }: { enrollment: Enrollment }) {
  const links = useWasichaiLinks()
  const title = enrollment.course.title
  return (
    <h3 className="text-base leading-snug font-semibold tracking-tight break-words">
      {/* una matrícula retirada ya no tiene aula (404): su título no enlaza a ningún sitio */}
      {enrollment.status === 'RETIRADA' ? (
        <span className="text-ink">{title}</span>
      ) : (
        <Link to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId: enrollment.id })} className={COURSE_LINK}>
          {title}
        </Link>
      )}
    </h3>
  )
}

// el bloque que destaca: el único objeto con tarjeta y banda de la pantalla, la lección exacta y la única primaria.
// la unidad y la lección se dicen por su número: el resumen de la matrícula no trae el título de la unidad
function PrimaryCourse({ enrollment, showZone }: { enrollment: Enrollment; showZone: boolean }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const next = enrollment.nextLesson!
  return (
    <article className="overflow-hidden rounded-card border border-border bg-surface">
      <CordBanner seed={enrollment.course.slug} height={56} />
      <div className="flex flex-col gap-4 px-5 pt-3 pb-5 sm:px-6 sm:pb-6">
        <div className="flex flex-col">
          <CourseTitle enrollment={enrollment} />
          <OfferingDates offering={enrollment.offering} showZone={showZone} />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-ink-muted">{t('classroom.position', { unit: next.unitOrder, lesson: next.lessonOrder })}</p>
          <p className="font-read text-title-2 text-balance break-words text-ink">{t('enrollments.next', { lesson: next.title })}</p>
        </div>
        <ProgressBar progress={enrollment.progress} label={t('progress.course')} knots={summaryKnots(enrollment.progress)} />
        <Button asChild className={`${WRAP} min-h-11 w-full px-6 sm:w-auto sm:self-start`}>
          <Link
            to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId: enrollment.id }, { [LESSON_PARAM]: next.id })}
            aria-label={t('enrollments.continueLabel', { course: enrollment.course.title })}
          >
            {t('enrollments.continue')}
          </Link>
        </Button>
      </div>
    </article>
  )
}

function CourseSection({ title, enrollments, showZone }: { title: string; enrollments: Enrollment[]; showZone: boolean }) {
  if (enrollments.length === 0) return null
  return (
    <Section title={title}>
      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {enrollments.map((enrollment) => (
          <li key={enrollment.id}>
            <CourseRow enrollment={enrollment} showZone={showZone} />
          </li>
        ))}
      </ul>
    </Section>
  )
}

function statusLine(enrollment: Enrollment): 'next' | 'finished' | 'closed' | 'noLessons' | 'withdrawn' {
  if (enrollment.status === 'RETIRADA') return 'withdrawn'
  if (canContinue(enrollment)) return 'next'
  if (allLessonsDone(enrollment)) return 'finished'
  return enrollment.status === 'FINALIZADA' ? 'closed' : 'noLessons'
}

// un curso que no es el principal: una fila, sin caja; a la derecha su avance y su acción, un enlace y no un botón.
// las dos columnas caben hasta lg y de nuevo desde xl: en medio, el riel y el menú del shell ya ocupan su sitio
function CourseRow({ enrollment, showZone }: { enrollment: Enrollment; showZone: boolean }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const params = { enrollmentId: enrollment.id }
  const course = enrollment.course.title
  const line = statusLine(enrollment)
  const code = enrollment.certificateCode
  return (
    <article className="grid grid-cols-1 gap-x-8 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_14rem] lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_14rem]">
      <div className="flex min-w-0 flex-col">
        <CourseTitle enrollment={enrollment} />
        <OfferingDates offering={enrollment.offering} showZone={showZone} />
        {line === 'withdrawn' ? (
          <p className="mt-2 flex">
            <StatusBadge state="neutral">{t('dashboard.withdrawnBadge')}</StatusBadge>
          </p>
        ) : (
          <p className="mt-2 text-sm break-words text-ink">
            {line === 'next'
              ? t('enrollments.next', { lesson: enrollment.nextLesson!.title })
              : line === 'finished'
                ? t('enrollments.finished')
                : t(line === 'closed' ? 'dashboard.closed' : 'dashboard.noLessons')}
          </p>
        )}
        {code ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusBadge state="achievement">{t('enrollments.certified')}</StatusBadge>
            <Link to={links.to(CLASSROOM_ROUTES.certificate, { code })} className={ACTION_LINK}>
              {t('enrollments.certificate', { course })}
            </Link>
          </div>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <ProgressBar progress={enrollment.progress} label={t('progress.course')} knots={summaryKnots(enrollment.progress)} />
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
    </article>
  )
}
