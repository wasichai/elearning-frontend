import { useAuth, useWasichaiConfig, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button, Table, Td, Th } from '@wasichai/ui'
import {
  BookOpen,
  Check,
  ChevronRight,
  CirclePlay,
  ClipboardCheck,
  Clock,
  FileText,
  FlaskConical,
  GraduationCap,
  Languages,
  MonitorPlay,
  Presentation,
  Radio,
  ChartNoAxesColumnIncreasing,
  type LucideIcon
} from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { TEXT_LINK } from '../../shared/buttons'
import { CordBanner } from '../../shared/CordBanner'
import { formatCivilDate, formatCivilRange, formatInstant, formatNumber, languageName, timeZoneLabel } from '../../shared/format'
import { Notice } from '../../shared/Notice'
import { PublicHeading, PublicLayout } from '../../shared/PublicLayout'
import { ScreenBody, ScreenHeader, Section, Skeleton, screenContainer } from '../../shared/Screen'
import { StatusBadge } from '../../shared/StatusBadge'
import { catalogKeys, useCourse, useMyEnrollments, useQueryProblem } from './api'
import type { CourseDetail, Credits, MyEnrollment, Offering } from './contract'
import { EnrollAction, GoToCourse } from './EnrollAction'
import { AVAILABILITY, Fact, IllustrativeMark, offeringState, useMatchesWidth, useOpenLabel } from './parts'
import { ProblemState, useProblemText } from './ProblemState'
import { CATALOG_ROUTES, CLASSROOM_ROUTE } from './routes'

const BANNER_HEIGHT = 120
// desde aquí, dos columnas con las ediciones fijas; por debajo, la acción al pie
const TWO_COLUMNS = '(min-width: 64rem)'
const ACTIVE_ENROLLMENT = 'ACTIVA'
// al llegar por teclado, lo enfocado no se queda debajo de la barra del pie
const CLEAR_OF_FOOTER = 'scroll-pb-40 [&_a]:scroll-mb-40 [&_button]:scroll-mb-40 [&_input]:scroll-mb-40 [&_summary]:scroll-mb-40'

export function CourseDetailPage() {
  const { slug = '' } = useParams()
  const query = useCourse(slug)
  const { problem, retry } = useQueryProblem(query, catalogKeys.course(slug))
  return (
    <PublicLayout fullBleed>
      {problem ? <CourseProblem error={problem} onRetry={retry} /> : query.data ? <CourseView course={query.data} /> : <CourseSkeleton />}
    </PublicLayout>
  )
}

function BackToCatalog() {
  const { t } = useTranslation('catalog')
  const links = useWasichaiLinks()
  return (
    <Link to={links.to(CATALOG_ROUTES.courses)} className={`${TEXT_LINK} self-start`}>
      {t('detail.back')}
    </Link>
  )
}

function CourseProblem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('catalog')
  const { kind, title, description } = useProblemText(error, 'course')
  // un 404 es una respuesta, no un fallo: el curso no existe, no está publicado o no es de esta organización
  if (kind === 'notFound')
    return (
      <div className={`${screenContainer()} pb-16`}>
        <PublicHeading title={title} subtitle={t('detail.notFoundHint')} />
        <BackToCatalog />
      </div>
    )
  return (
    <div className={screenContainer()}>
      <ProblemState title={title} description={description}>
        <Button variant="secondary" onClick={onRetry}>
          {t('problem.retry')}
        </Button>
        <BackToCatalog />
      </ProblemState>
    </div>
  )
}

// el hueco de la ficha, con su geometría: banda, cabecera, contenido y columna de ediciones
function CourseSkeleton() {
  const { t } = useTranslation('catalog')
  return (
    <div role="status" data-slot="course-skeleton">
      <span className="sr-only">{t('detail.loading')}</span>
      <div style={{ height: BANNER_HEIGHT }} className="bg-surface-muted" />
      <div className="border-b border-border bg-surface">
        <div className={`${screenContainer()} flex flex-col gap-3 py-6`}>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-full max-w-prose" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      </div>
      <div className={`${screenContainer()} flex flex-col gap-8 pt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_21.25rem] lg:gap-10`}>
        <Skeleton className="h-64 lg:row-start-1" />
        <Skeleton className="h-64 lg:col-start-2 lg:row-start-1" />
      </div>
    </div>
  )
}

function CourseView({ course }: { course: CourseDetail }) {
  const { t, i18n } = useTranslation('catalog')
  const { timeZone } = useWasichaiConfig()
  const { user } = useAuth()
  const links = useWasichaiLinks()
  const twoColumns = useMatchesWidth(TWO_COLUMNS)
  const locale = i18n.language

  // la única primaria de la pantalla: volver al curso si la persona ya está en él; si no, matricularse en la primera edición abierta
  const canEnroll = links.has(CLASSROOM_ROUTE)
  const enrollments = useMyEnrollments(course.slug, Boolean(user) && canEnroll)
  const current = enrollments.find((enrollment) => enrollment.status === ACTIVE_ENROLLMENT) ?? enrollments[0]
  const firstOpen = canEnroll && !current ? course.offerings.find((offering) => offeringState(offering) === 'open') : undefined
  const currentOutsideOfferings = current && !course.offerings.some((offering) => offering.code === current.offering.code)
  const footer = !twoColumns && (current || firstOpen)

  return (
    <article className={`flex flex-col ${footer ? CLEAR_OF_FOOTER : ''}`}>
      <CordBanner seed={course.slug} height={BANNER_HEIGHT} />
      <ScreenHeader
        title={course.title}
        subtitle={course.summary ?? undefined}
        breadcrumbs={
          <div className="flex flex-col items-start gap-1">
            <BackToCatalog />
            {course.category || course.illustrative ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
                {course.category ? <span>{course.category.name}</span> : null}
                {course.illustrative ? <IllustrativeMark /> : null}
              </div>
            ) : null}
          </div>
        }
        meta={<CourseFacts course={course} />}
      />
      <ScreenBody className="lg:grid lg:grid-cols-[minmax(0,1fr)_21.25rem] lg:items-start lg:gap-10">
        {/* antes en el DOM que el contenido: en una sola columna, las ediciones van primero y es lo que se recorre primero */}
        <aside className="-m-1 flex min-w-0 flex-col gap-4 p-1 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto">
          {current && currentOutsideOfferings ? (
            <div className="flex flex-col gap-3">
              <Notice tone="notice">{t('enroll.enrolledElsewhere')}</Notice>
              {twoColumns ? <GoToCourse enrollmentId={current.id} /> : null}
            </div>
          ) : null}
          <Offerings offerings={course.offerings} enrollments={enrollments} current={current} firstOpen={firstOpen} actionInFooter={!twoColumns} />
        </aside>
        <div className="flex min-w-0 flex-col gap-10 lg:col-start-1 lg:row-start-1">
          {course.objectives.length + course.learningOutcomes.length > 0 ? (
            <Section title={t('detail.goals')}>
              <div className="flex flex-col gap-5">
                <Lines title={t('detail.objectives')} lines={course.objectives} />
                <Lines title={t('detail.outcomes')} lines={course.learningOutcomes} />
              </div>
            </Section>
          ) : null}

          <Syllabus course={course} />

          {course.requirements || course.prerequisiteKnowledge || course.prerequisiteKnowledgeTags.length > 0 ? (
            <Section title={t('detail.before')}>
              <div className="flex flex-col gap-5">
                <Knowledge tags={course.prerequisiteKnowledgeTags} text={course.prerequisiteKnowledge} />
                <Prose title={t('detail.requirements')} text={course.requirements} />
              </div>
            </Section>
          ) : null}

          {course.assessment || course.certification ? (
            <Section title={t('detail.assessmentAndCertification')}>
              <div className="flex flex-col gap-5">
                <Prose title={t('detail.assessment')} text={course.assessment} />
                <Prose title={t('detail.certification')} text={course.certification} />
              </div>
            </Section>
          ) : null}

          {course.teachers.length > 0 ? (
            <Section title={t('detail.teachers')}>
              <ul className="flex flex-col divide-y divide-border">
                {course.teachers.map((teacher) => (
                  <li key={teacher.name} className="flex flex-col gap-1 py-3 text-sm first:pt-0 last:pb-0">
                    <p className="font-medium text-ink">
                      {teacher.name}
                      {teacher.professionalTitle ? <span className="font-normal text-ink-muted"> · {teacher.professionalTitle}</span> : null}
                    </p>
                    {teacher.specialties ? <p className="text-ink-muted">{teacher.specialties}</p> : null}
                    {teacher.bio ? <p className="max-w-prose text-ink">{teacher.bio}</p> : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section title={course.credits.system ? t('detail.workloadAndCredits') : t('detail.workload')}>
            <div className="flex flex-col gap-4">
              <Workload course={course} />
              <CreditsView credits={course.credits} />
            </div>
          </Section>

          {course.sources.length > 0 ? (
            <Section title={t('detail.sources')}>
              <Lines lines={course.sources} />
            </Section>
          ) : null}

          <Section title={t('detail.about')}>
            <dl className="flex flex-col gap-1 text-sm">
              <Fact label={t('detail.code')}>{course.code}</Fact>
              <Fact label={t('detail.version')}>
                {course.version.publishedAt
                  ? t('detail.versionPublished', { number: course.version.number, date: formatInstant(course.version.publishedAt, locale, timeZone) })
                  : t('detail.versionNumber', { number: course.version.number })}
              </Fact>
            </dl>
          </Section>
        </div>
      </ScreenBody>
      {footer ? <ActionFooter current={current} firstOpen={firstOpen} /> : null}
    </article>
  )
}

// un dato de la cabecera: icono y valor, con su nombre para quien no ve el icono
function HeroFact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <dt className="sr-only">{label}</dt>
      <dd className="text-ink tabular-nums">{children}</dd>
    </div>
  )
}

function CourseFacts({ course }: { course: CourseDetail }) {
  const { t, i18n } = useTranslation('catalog')
  const locale = i18n.language
  const n = (value: number) => formatNumber(value, locale)
  const { system, approved, proposal } = course.credits
  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-1.5">
      <HeroFact icon={Clock} label={t('course.duration')}>
        {t('course.durationValue', { count: course.weeks, hours: n(course.workload.totalHours) })}
      </HeroFact>
      {system && approved !== null ? (
        <HeroFact icon={GraduationCap} label={t('detail.credits')}>
          {t('detail.creditsApproved', { value: n(approved), system })}
        </HeroFact>
      ) : system && proposal ? (
        <HeroFact icon={GraduationCap} label={t('detail.credits')}>
          {t('detail.creditsProposed', { value: n(proposal.proposed), system })}
        </HeroFact>
      ) : null}
      <HeroFact icon={MonitorPlay} label={t('course.modality')}>
        {t(`modality.${course.modality}`)}
      </HeroFact>
      <HeroFact icon={ChartNoAxesColumnIncreasing} label={t('course.level')}>
        {t(`level.${course.level}`)}
      </HeroFact>
      <HeroFact icon={Languages} label={t('detail.language')}>
        {languageName(course.language, locale)}
      </HeroFact>
    </dl>
  )
}

function Lines({ title, lines }: { title?: string; lines: string[] }) {
  if (lines.length === 0) return null
  return (
    <div className="flex flex-col gap-2 text-sm">
      {title ? <h3 className="font-medium text-ink">{title}</h3> : null}
      <ul className="flex max-w-prose flex-col gap-1.5 text-ink">
        {lines.map((line) => (
          <li key={line} className="flex gap-2">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
            <span className="min-w-0">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Prose({ title, text }: { title: string; text: string | null }) {
  if (!text) return null
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <h3 className="font-medium text-ink">{title}</h3>
      <p className="max-w-prose whitespace-pre-line text-ink">{text}</p>
    </div>
  )
}

// RF-CAT-08: las claves que declaró la versión (las del filtro del catálogo) y, debajo, el texto libre del curso
function Knowledge({ tags, text }: { tags: CourseDetail['prerequisiteKnowledgeTags']; text: string | null }) {
  const { t } = useTranslation('catalog')
  const id = useId()
  if (!text && tags.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <h3 id={id} className="font-medium text-ink">
        {t('detail.prerequisiteKnowledge')}
      </h3>
      {tags.length > 0 ? (
        <ul aria-labelledby={id} className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag.key} className="rounded-md border border-border px-2.5 py-0.5 text-ink">
              {tag.name}
            </li>
          ))}
        </ul>
      ) : null}
      {text ? <p className="max-w-prose whitespace-pre-line text-ink">{text}</p> : null}
    </div>
  )
}

// el tipo de lección es un vocabulario abierto: lo que no se conoce lleva el icono de un documento
const LESSON_ICONS: Record<string, LucideIcon> = {
  LECTURA: BookOpen,
  VIDEO: CirclePlay,
  PRESENTACION: Presentation,
  LABORATORIO: FlaskConical,
  EVALUACION: ClipboardCheck,
  SESION: Radio
}

// el temario público: para saber qué trae el curso, sin avance ni enlaces. solo la primera unidad se abre por sí sola
function Syllabus({ course }: { course: CourseDetail }) {
  const { t } = useTranslation('catalog')
  if (course.units.length === 0) return null
  const units = [...course.units].sort((a, b) => a.order - b.order)
  const lessons = units.reduce((total, unit) => total + unit.lessons.length, 0)
  const count = t('detail.syllabusCount', {
    units: t('detail.syllabusUnits', { count: units.length }),
    lessons: t('detail.syllabusLessons', { count: lessons })
  })
  return (
    <Section title={t('detail.syllabus')} description={count}>
      <ol className="flex flex-col divide-y divide-border border-y border-border">
        {units.map((unit, index) => (
          <li key={unit.order}>
            <SyllabusUnit unit={unit} open={index === 0} />
          </li>
        ))}
      </ol>
    </Section>
  )
}

function SyllabusUnit({ unit, open }: { unit: CourseDetail['units'][number]; open: boolean }) {
  const { t, i18n } = useTranslation('catalog')
  const lessonType = useOpenLabel('lessonType')
  const n = (value: number) => formatNumber(value, i18n.language)
  const hasBody = unit.description !== null || unit.lessons.length > 0
  const heading = (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <h3 className="min-w-0 text-sm font-semibold text-ink">{t('detail.unit', { order: unit.order, title: unit.title })}</h3>
      <p className="shrink-0 text-sm text-ink-muted tabular-nums">
        {unit.estimatedHours === null
          ? t('detail.unitLessons', { count: unit.lessons.length })
          : t('detail.unitMeta', { count: unit.lessons.length, hours: n(unit.estimatedHours) })}
      </p>
    </div>
  )
  if (!hasBody) return <div className="flex min-h-13 items-center py-2 pl-6">{heading}</div>
  return (
    <details open={open} className="group/unit">
      <summary className="flex min-h-13 cursor-pointer list-none items-center gap-2 py-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-ink-muted transition-transform duration-[160ms] group-open/unit:rotate-90 motion-reduce:transition-none"
        />
        {heading}
      </summary>
      <div className="flex flex-col gap-2 pb-3 pl-6">
        {unit.description ? <p className="max-w-prose text-sm text-ink-muted">{unit.description}</p> : null}
        {unit.lessons.length > 0 ? (
          <ol className="flex flex-col">
            {[...unit.lessons]
              .sort((a, b) => a.order - b.order)
              .map((lesson) => {
                const Icon = LESSON_ICONS[lesson.type] ?? FileText
                return (
                  <li key={lesson.order} className="flex items-start gap-2 py-1.5 text-sm">
                    <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                      <span className="min-w-0 text-ink">{lesson.title}</span>
                      <span className="shrink-0 text-ink-muted tabular-nums">
                        {lessonType(lesson.type)}
                        {lesson.durationMinutes === null ? null : ` · ${t('detail.minutes', { value: n(lesson.durationMinutes) })}`}
                      </span>
                    </div>
                  </li>
                )
              })}
          </ol>
        ) : null}
      </div>
    </details>
  )
}

interface OfferingsProps {
  offerings: Offering[]
  enrollments: MyEnrollment[]
  current: MyEnrollment | undefined
  firstOpen: Offering | undefined
  // en una columna, la acción principal va en la barra del pie y no en su tarjeta
  actionInFooter: boolean
}

function Offerings({ offerings, enrollments, current, firstOpen, actionInFooter }: OfferingsProps) {
  const { t } = useTranslation('catalog')
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-title-3 text-ink">
        {t('detail.offerings')}
      </h2>
      {offerings.length === 0 ? (
        <Notice tone="notice" title={t('offering.none')}>
          {t('detail.noOfferingsHint')}
        </Notice>
      ) : (
        <ul className="flex flex-col gap-3">
          {offerings.map((offering) => (
            <li key={offering.code}>
              <OfferingCard
                offering={offering}
                enrollment={enrollments.find((enrollment) => enrollment.offering.code === offering.code)}
                current={current}
                firstOpen={firstOpen}
                actionInFooter={actionInFooter}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface OfferingCardProps {
  offering: Offering
  enrollment: MyEnrollment | undefined
  current: MyEnrollment | undefined
  firstOpen: Offering | undefined
  actionInFooter: boolean
}

// las fechas de una edición son fechas civiles de su zona: se escriben en esa zona y se dice cuál es
function OfferingCard({ offering, enrollment, current, firstOpen, actionInFooter }: OfferingCardProps) {
  const { t, i18n } = useTranslation('catalog')
  const role = useOpenLabel('teacherRole')
  const locale = i18n.language
  const zone = offering.timeZone
  const state = offeringState(offering)
  const isPrimary = enrollment ? enrollment === current : offering === firstOpen
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 text-sm">
      <h3 className="flex flex-col items-start gap-1.5 text-base font-semibold text-ink">
        <span>{formatCivilRange(offering.startDate, offering.endDate, zone, locale)}</span>
        {enrollment ? (
          <StatusBadge state={enrollment.status === ACTIVE_ENROLLMENT ? 'active' : 'done'}>
            {t(enrollment.status === ACTIVE_ENROLLMENT ? 'enroll.enrolled' : 'enroll.finished')}
          </StatusBadge>
        ) : (
          <StatusBadge state={AVAILABILITY[state]}>{t(`offering.state.${state}`)}</StatusBadge>
        )}
      </h3>
      <dl className="flex flex-col gap-1">
        {offering.enrollmentFrom && offering.enrollmentUntil ? (
          <Fact label={t('detail.enrollment')}>{formatCivilRange(offering.enrollmentFrom, offering.enrollmentUntil, zone, locale)}</Fact>
        ) : offering.enrollmentUntil ? (
          <Fact label={t('detail.enrollment')}>{t('detail.until', { date: formatCivilDate(offering.enrollmentUntil, zone, locale) })}</Fact>
        ) : null}
        {offering.schedule ? <Fact label={t('detail.schedule')}>{offering.schedule}</Fact> : null}
        {offering.capacity ? <Fact label={t('detail.capacity')}>{t('detail.seats', { count: offering.capacity })}</Fact> : null}
        <Fact label={t('detail.timeZone')}>{t('detail.timeZoneValue', { name: timeZoneLabel(zone, locale), zone })}</Fact>
        {offering.teachers.length > 0 ? (
          <Fact label={t('detail.offeringTeachers')}>
            {offering.teachers.map((teacher) => t('detail.teacherWithRole', { name: teacher.name, role: role(teacher.role) })).join(' · ')}
          </Fact>
        ) : null}
      </dl>
      {isPrimary && actionInFooter ? null : enrollment ? (
        <GoToCourse enrollmentId={enrollment.id} primary={isPrimary} />
      ) : state === 'open' ? (
        <EnrollAction offering={offering} primary={isPrimary} />
      ) : (
        <p className="text-ink-muted">{t(`detail.offeringHint.${state}`)}</p>
      )}
    </div>
  )
}

// en una columna, la razón de la página queda siempre a mano. va en el flujo, al final del artículo: se pega abajo al desplazar
// y, al llegar al final, se queda debajo del contenido en vez de taparlo
function ActionFooter({ current, firstOpen }: { current: MyEnrollment | undefined; firstOpen: Offering | undefined }) {
  const { t, i18n } = useTranslation('catalog')
  return (
    <div data-slot="course-action" className="sticky bottom-0 z-10 border-t border-border bg-surface print:hidden">
      <div className={`${screenContainer()} flex flex-col gap-2 py-3`}>
        {current ? (
          <GoToCourse enrollmentId={current.id} />
        ) : firstOpen ? (
          <>
            <p className="text-sm">
              <span className="text-ink-muted">{t('offering.next')} </span>
              <span className="text-ink">{formatCivilRange(firstOpen.startDate, firstOpen.endDate, firstOpen.timeZone, i18n.language)}</span>
            </p>
            <EnrollAction offering={firstOpen} />
          </>
        ) : null}
      </div>
    </div>
  )
}

const WORKLOAD_ROWS = ['theory', 'practice', 'supervised', 'autonomous'] as const

function Workload({ course }: { course: CourseDetail }) {
  const { t, i18n } = useTranslation('catalog')
  const w = course.workload
  const n = (value: number) => formatNumber(value, i18n.language)
  const totals = { theory: w.theoryHours, practice: w.practiceHours, supervised: w.supervisedHours, autonomous: w.autonomousHours }
  const weeklyTotal = WORKLOAD_ROWS.reduce((total, key) => total + w.weekly[key], 0)
  const rowHead = 'bg-transparent text-sm normal-case tracking-normal text-ink'
  return (
    <div className="flex flex-col gap-3">
      <Table>
        <caption className="pb-2 text-left text-sm text-ink-muted">{t('workload.caption', { count: w.weeks })}</caption>
        <thead>
          <tr>
            <Th scope="col">{t('workload.component')}</Th>
            <Th scope="col" className="text-right">
              {t('workload.perWeek')}
            </Th>
            <Th scope="col" className="text-right">
              {t('workload.total')}
            </Th>
          </tr>
        </thead>
        <tbody>
          {WORKLOAD_ROWS.map((key) => (
            <tr key={key}>
              <Th scope="row" className={`${rowHead} font-normal`}>
                {t(`workload.${key}`)}
              </Th>
              <Td className="text-right tabular-nums">{n(w.weekly[key])}</Td>
              <Td className="text-right tabular-nums">{n(totals[key])}</Td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <Th scope="row" className={rowHead}>
              {t('workload.sum')}
            </Th>
            <Td className="text-right font-semibold tabular-nums">{n(weeklyTotal)}</Td>
            <Td className="text-right font-semibold tabular-nums">{n(w.totalHours)}</Td>
          </tr>
        </tfoot>
      </Table>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <Fact label={t('workload.contact')}>{t('workload.hours', { value: n(w.contactHours) })}</Fact>
        <Fact label={t('workload.directed')}>{t('workload.hours', { value: n(w.directedHours) })}</Fact>
      </dl>
    </div>
  )
}

// los créditos son una propuesta calculada por una política, nunca un dato oficial, salvo que una persona los apruebe
function CreditsView({ credits }: { credits: Credits }) {
  const { t, i18n } = useTranslation('catalog')
  const n = (value: number) => formatNumber(value, i18n.language)
  if (!credits.system) return null
  if (credits.approved !== null)
    return <p className="text-sm font-medium text-ink">{t('credits.approved', { value: n(credits.approved), system: credits.system })}</p>
  const proposal = credits.proposal
  if (!proposal) return null
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="font-medium text-ink">{t('credits.proposed', { count: proposal.proposed, value: n(proposal.proposed), system: proposal.system })}</p>
      {proposal.warnings.length > 0 ? (
        <Alert tone="warning" title={t('credits.warnings')}>
          <ul className="list-disc pl-5">
            {proposal.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      <details>
        <summary className={`${TEXT_LINK} cursor-pointer`}>{t('credits.how')}</summary>
        <dl className="mt-3 flex flex-col gap-1">
          <Fact label={t('credits.method')}>{proposal.method}</Fact>
          <Fact label={t('credits.parameters')}>
            {Object.entries(proposal.parameters)
              .map(([name, value]) => `${name} = ${value}`)
              .join(', ')}
          </Fact>
          <Fact label={t('credits.calculation')}>
            {t('credits.calculationValue', { hours: n(proposal.totalHours), calculated: n(proposal.calculated), proposed: n(proposal.proposed) })}
          </Fact>
          <Fact label={t('credits.policy')}>{t('credits.policyValue', { id: proposal.policyId, version: proposal.policyVersion })}</Fact>
          <Fact label={t('credits.source')}>{proposal.source}</Fact>
        </dl>
      </details>
    </div>
  )
}
