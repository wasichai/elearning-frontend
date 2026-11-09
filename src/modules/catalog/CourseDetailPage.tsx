import { useAuth, useWasichaiConfig, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button, Table, Td, Th } from '@wasichai/ui'
import { ChevronDown, FileText } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { TEXT_LINK } from '../../shared/buttons'
import { formatCivilDate, formatCivilRange, formatInstant, formatNumber, languageName, timeZoneLabel } from '../../shared/format'
import { Initials } from '../../shared/Initials'
import { Notice } from '../../shared/Notice'
import { PublicHeading, PublicLayout } from '../../shared/PublicLayout'
import { Section, Skeleton, screenContainer } from '../../shared/Screen'
import { StatusBadge } from '../../shared/StatusBadge'
import { catalogKeys, useCourse, useMyEnrollments, useQueryProblem } from './api'
import type { CourseDetail, Credits, MyEnrollment, Offering } from './contract'
import { EnrollAction, GoToCourse } from './EnrollAction'
import { AVAILABILITY, Fact, IllustrativeMark, offeringState, useMatchesWidth, useOpenLabel } from './parts'
import { ProblemState, useProblemText } from './ProblemState'
import { CATALOG_ROUTES, CLASSROOM_ROUTE } from './routes'

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
  const { kind, title, description, technical } = useProblemText(error, 'course')
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
      <ProblemState title={title} description={description} technical={technical}>
        <Button variant="secondary" onClick={onRetry}>
          {t('problem.retry')}
        </Button>
        <BackToCatalog />
      </ProblemState>
    </div>
  )
}

// el hueco de la ficha, con su geometría: portadilla, contenido y columna fija
function CourseSkeleton() {
  const { t } = useTranslation('catalog')
  return (
    <div role="status" data-slot="course-skeleton" className={`${screenContainer()} flex flex-col gap-10 pt-6 pb-16 lg:pt-9`}>
      <span className="sr-only">{t('detail.loading')}</span>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-14 w-3/4" />
        <Skeleton className="h-6 w-full max-w-measure" />
        <Skeleton className="h-10 w-2/3" />
      </div>
      <div className={`flex flex-col gap-10 ${TWO_COLUMN_GRID}`}>
        <Skeleton className="h-64 lg:col-start-2 lg:row-start-1" />
        <Skeleton className="h-96 lg:row-start-1" />
      </div>
    </div>
  )
}

// en escritorio, el contenido y la columna fija (edición recomendada, índice y el resto de ediciones)
const TWO_COLUMN_GRID = 'lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-12'

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
  const currentOffering = current ? course.offerings.find((offering) => offering.code === current.offering.code) : undefined
  const footer = !twoColumns && (current || firstOpen)
  const numbers = numberSections(sectionsOf(course))

  return (
    <article className={`flex flex-col ${footer ? CLEAR_OF_FOOTER : ''}`}>
      <div className={`${screenContainer()} flex flex-col gap-10 pt-6 pb-16 lg:pt-9 ${TWO_COLUMN_GRID}`}>
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <TitlePage course={course} />
        </div>
        {/* antes en el DOM que el contenido: en una sola columna, las ediciones van primero y es lo que se recorre primero. en dos, la
            columna fija empieza junto a la portadilla: la acción se ve al abrir la ficha */}
        <aside
          data-slot="course-aside"
          className="-m-1 flex min-w-0 flex-col gap-8 p-1 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto"
        >
          {current && !currentOffering ? (
            <div className="flex flex-col gap-3">
              <Notice tone="notice">{t('enroll.enrolledElsewhere')}</Notice>
              {twoColumns ? <GoToCourse enrollmentId={current.id} /> : null}
            </div>
          ) : null}
          <Offerings offerings={course.offerings} enrollments={enrollments} current={current} firstOpen={firstOpen} actionInFooter={!twoColumns} />
          <OnThisPage numbers={numbers} withCredits={course.credits.system !== null} />
        </aside>
        <div className="flex min-w-0 flex-col gap-12 lg:col-start-1 lg:row-start-2">
          {numbers.goals ? (
            <Section title={t('detail.goals')} anchor={ANCHORS.goals} number={numbers.goals}>
              <div className="flex flex-col gap-6">
                <Lines title={t('detail.objectives')} lines={course.objectives} />
                <Lines title={t('detail.outcomes')} lines={course.learningOutcomes} />
              </div>
            </Section>
          ) : null}

          {numbers.syllabus ? <Syllabus course={course} number={numbers.syllabus} /> : null}

          {numbers.before ? (
            <Section title={t('detail.before')} anchor={ANCHORS.before} number={numbers.before}>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(16rem,100%),1fr))] gap-x-10 gap-y-6">
                <Knowledge tags={course.prerequisiteKnowledgeTags} text={course.prerequisiteKnowledge} />
                <Prose title={t('detail.requirements')} text={course.requirements} />
              </div>
            </Section>
          ) : null}

          {numbers.assessment ? (
            <Section title={t('detail.assessmentAndCertification')} anchor={ANCHORS.assessment} number={numbers.assessment}>
              <div className="flex flex-col gap-6">
                <Prose title={t('detail.assessment')} text={course.assessment} />
                <Prose title={t('detail.certification')} text={course.certification} />
              </div>
            </Section>
          ) : null}

          {numbers.teachers ? (
            <Section title={t('detail.teachers')} anchor={ANCHORS.teachers} number={numbers.teachers}>
              <ul className="flex flex-col gap-6">
                {course.teachers.map((teacher) => (
                  <li key={teacher.name} className="grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-4">
                    <Initials of={teacher.name} className="font-read size-16 text-h4" />
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="font-read text-h4 text-ink">{teacher.name}</p>
                      {teacher.professionalTitle || teacher.specialties ? (
                        <p className="text-secondary text-ink-muted">{[teacher.professionalTitle, teacher.specialties].filter(Boolean).join(' · ')}</p>
                      ) : null}
                      {teacher.bio ? <p className="font-read text-body mt-1 max-w-measure text-ink italic">{teacher.bio}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section title={course.credits.system ? t('detail.workloadAndCredits') : t('detail.workload')} anchor={ANCHORS.workload} number={numbers.workload}>
            <div className="flex flex-col gap-4">
              <Workload course={course} />
              <CreditsView credits={course.credits} />
            </div>
          </Section>

          {numbers.sources ? (
            <Section title={t('detail.sources')} anchor={ANCHORS.sources} number={numbers.sources}>
              <Sources sources={course.sources} />
            </Section>
          ) : null}

          <Section title={t('detail.about')} anchor={ANCHORS.about} number={numbers.about}>
            <dl className="text-secondary flex flex-col gap-1">
              <Fact label={t('detail.code')}>{course.code}</Fact>
              <Fact label={t('detail.version')}>
                {course.version.publishedAt
                  ? t('detail.versionPublished', { number: course.version.number, date: formatInstant(course.version.publishedAt, locale, timeZone) })
                  : t('detail.versionNumber', { number: course.version.number })}
              </Fact>
            </dl>
          </Section>
        </div>
      </div>
      {footer ? <ActionFooter current={current} currentOffering={currentOffering} firstOpen={firstOpen} /> : null}
    </article>
  )
}

// la portadilla: la colección sobre un filete de tinta, el título, el resumen y una línea con los datos que da la API
function TitlePage({ course }: { course: CourseDetail }) {
  const { t } = useTranslation('catalog')
  return (
    <header className="flex flex-col gap-4">
      <BackToCatalog />
      {course.category || course.illustrative ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ink pb-2">
          {course.category ? (
            <span className="meta text-ink">
              {t('detail.collection')} · <span>{course.category.name}</span>
            </span>
          ) : (
            <span />
          )}
          {course.illustrative ? <IllustrativeMark /> : null}
        </div>
      ) : null}
      <h1 className="font-read mt-2 max-w-[22ch] text-h2 text-balance break-words text-ink sm:text-h1 lg:text-display">{course.title}</h1>
      {course.summary ? <p className="font-read text-reading max-w-measure text-ink">{course.summary}</p> : null}
      <CourseFacts course={course} />
    </header>
  )
}

// un dato de la portadilla: su nombre en versalitas y, debajo, el valor
function TitleFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="meta">{label}</dt>
      <dd className="text-h5 text-ink tabular-nums">{children}</dd>
    </div>
  )
}

function CourseFacts({ course }: { course: CourseDetail }) {
  const { t, i18n } = useTranslation('catalog')
  const locale = i18n.language
  const n = (value: number) => formatNumber(value, locale)
  const { system, approved, proposal } = course.credits
  return (
    <dl className="mt-2 flex flex-wrap gap-x-9 gap-y-3">
      <TitleFact label={t('course.duration')}>{t('course.durationValue', { count: course.weeks, hours: n(course.workload.totalHours) })}</TitleFact>
      {system && approved !== null ? (
        <TitleFact label={t('detail.credits')}>{t('detail.creditsApproved', { value: n(approved), system })}</TitleFact>
      ) : system && proposal ? (
        <TitleFact label={t('detail.credits')}>{t('detail.creditsProposed', { value: n(proposal.proposed), system })}</TitleFact>
      ) : null}
      <TitleFact label={t('course.modality')}>{t(`modality.${course.modality}`)}</TitleFact>
      <TitleFact label={t('course.level')}>{t(`level.${course.level}`)}</TitleFact>
      <TitleFact label={t('detail.language')}>{languageName(course.language, locale)}</TitleFact>
    </dl>
  )
}

// las secciones de la ficha, en su orden, con su ancla: las pinta la ficha, las numera «§n» y las enlaza el índice
const ANCHORS = {
  goals: 'objetivos',
  syllabus: 'temario',
  before: 'antes-de-empezar',
  assessment: 'evaluacion',
  teachers: 'docentes',
  workload: 'carga-de-trabajo',
  sources: 'fuentes',
  about: 'datos-del-curso'
} as const
type SectionKey = keyof typeof ANCHORS
// un destino dentro de la misma ficha, no una pantalla: no pasa por useWasichaiLinks
const fragment = (anchor: string) => `#${anchor}`

// si el curso tiene de qué hablar en cada sección
function sectionsOf(course: CourseDetail): Record<SectionKey, boolean> {
  return {
    goals: course.objectives.length + course.learningOutcomes.length > 0,
    syllabus: course.units.length > 0,
    before: Boolean(course.requirements || course.prerequisiteKnowledge || course.prerequisiteKnowledgeTags.length > 0),
    assessment: Boolean(course.assessment || course.certification),
    teachers: course.teachers.length > 0,
    workload: true,
    sources: course.sources.length > 0,
    about: true
  }
}

// la cifra de cada sección presente, seguidas y sin huecos; las ausentes no tienen
function numberSections(present: Record<SectionKey, boolean>): Partial<Record<SectionKey, string>> {
  const keys = (Object.keys(ANCHORS) as SectionKey[]).filter((key) => present[key])
  return Object.fromEntries(keys.map((key, index) => [key, String(index + 1)]))
}

// «En esta página», en la columna fija: las secciones con su «§n», como el índice de un libro
function OnThisPage({ numbers, withCredits }: { numbers: Partial<Record<SectionKey, string>>; withCredits: boolean }) {
  const { t } = useTranslation('catalog')
  const id = useId()
  const titles: Record<SectionKey, string> = {
    goals: t('detail.goals'),
    syllabus: t('detail.syllabus'),
    before: t('detail.before'),
    assessment: t('detail.assessmentAndCertification'),
    teachers: t('detail.teachers'),
    workload: withCredits ? t('detail.workloadAndCredits') : t('detail.workload'),
    sources: t('detail.sources'),
    about: t('detail.about')
  }
  const keys = (Object.keys(ANCHORS) as SectionKey[]).filter((key) => numbers[key])
  if (keys.length < 3) return null
  return (
    <nav aria-labelledby={id} className="flex flex-col print:hidden">
      <p id={id} className="meta border-b border-ink pb-1.5">
        {t('detail.onThisPage')}
      </p>
      <ol className="flex flex-col">
        {keys.map((key) => (
          <li key={key}>
            <a
              href={fragment(ANCHORS[key])}
              className="font-read text-body flex min-h-11 items-baseline gap-3 rounded-sm py-2.5 text-ink hover:text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span aria-hidden="true" className="text-secondary w-8 shrink-0 font-sans text-ink-muted tabular-nums">
                §{numbers[key]}
              </span>
              <span className="min-w-0">{titles[key]}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

// una fuente de un repositorio (owner/repo@commit:ruta) se lee por el nombre de su documento; la referencia exacta queda debajo
const REPOSITORY_SOURCE = /^[\w.-]+\/[\w.-]+@[0-9a-f]{6,40}:(\S+)$/

function sourceTitle(path: string): string {
  const file = path.split('/').pop() ?? path
  const name = file
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
  return name ? name[0]!.toLocaleUpperCase() + name.slice(1) : file
}

function Sources({ sources }: { sources: string[] }) {
  return (
    <ul className="flex max-w-prose flex-col gap-3 text-sm">
      {sources.map((source) => {
        const path = REPOSITORY_SOURCE.exec(source)?.[1]
        return (
          <li key={source} className="flex gap-2">
            <FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
            {path ? (
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-ink">{sourceTitle(path)}</span>
                <span className="font-mono text-xs break-all text-ink-muted">{source}</span>
              </span>
            ) : (
              <span className="min-w-0 text-ink">{source}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// lo que se aprende, como una lista numerada en el cuerpo de lectura
function Lines({ title, lines }: { title?: string; lines: string[] }) {
  if (lines.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {title ? <h3 className="text-h5 text-ink">{title}</h3> : null}
      <ol className="font-read text-reading flex max-w-measure list-decimal flex-col gap-2 pl-7 text-ink">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
    </div>
  )
}

function Prose({ title, text }: { title: string; text: string | null }) {
  if (!text) return null
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-h5 text-ink">{title}</h3>
      <p className="font-read text-reading max-w-measure whitespace-pre-line text-ink">{text}</p>
    </div>
  )
}

// RF-CAT-08: las claves que declaró la versión (las del filtro del catálogo) y, debajo, el texto libre del curso
function Knowledge({ tags, text }: { tags: CourseDetail['prerequisiteKnowledgeTags']; text: string | null }) {
  const { t } = useTranslation('catalog')
  const id = useId()
  if (!text && tags.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <h3 id={id} className="text-h5 text-ink">
        {t('detail.prerequisiteKnowledge')}
      </h3>
      {tags.length > 0 ? (
        <ul aria-labelledby={id} className="text-secondary flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag.key} className="rounded-sm border border-border bg-surface px-2.5 py-0.5 text-ink">
              {tag.name}
            </li>
          ))}
        </ul>
      ) : null}
      {text ? <p className="font-read text-reading max-w-measure whitespace-pre-line text-ink">{text}</p> : null}
    </div>
  )
}

// el temario público, como el índice de un libro: unidades plegables y, en cada una, sus lecciones con tipo y minutos. sin avance
// ni enlaces. solo la primera unidad se abre por sí sola
function Syllabus({ course, number }: { course: CourseDetail; number: string }) {
  const { t } = useTranslation('catalog')
  const units = [...course.units].sort((a, b) => a.order - b.order)
  const lessons = units.reduce((total, unit) => total + unit.lessons.length, 0)
  const count = t('detail.syllabusCount', {
    units: t('detail.syllabusUnits', { count: units.length }),
    lessons: t('detail.syllabusLessons', { count: lessons })
  })
  return (
    <Section title={t('detail.syllabus')} action={count} anchor={ANCHORS.syllabus} number={number}>
      <ol className="flex flex-col divide-y divide-border border-b border-border">
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
    <>
      <span aria-hidden="true" className="text-secondary w-8 shrink-0 text-ink-muted tabular-nums">
        {unit.order}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <h3 className="font-read min-w-0 text-h4 text-ink">
          <span className="sr-only">{t('detail.unitNumber', { order: unit.order })}</span> {unit.title}
        </h3>
        <p className="text-secondary shrink-0 text-ink-muted tabular-nums">
          {unit.estimatedHours === null
            ? t('detail.unitLessons', { count: unit.lessons.length })
            : t('detail.unitMeta', { count: unit.lessons.length, hours: n(unit.estimatedHours) })}
        </p>
      </div>
    </>
  )
  if (!hasBody) return <div className="flex min-h-11 items-baseline gap-3 py-3 pr-7">{heading}</div>
  return (
    <details open={open} className="group/unit">
      <summary className="flex min-h-11 cursor-pointer list-none items-baseline gap-3 py-3 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
        {heading}
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 self-center text-ink-muted transition-transform duration-[160ms] group-open/unit:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="flex flex-col gap-2 pb-4 sm:pl-11">
        {unit.description ? <p className="text-secondary max-w-measure text-ink-muted">{unit.description}</p> : null}
        {unit.lessons.length > 0 ? (
          <ol className="flex flex-col">
            {[...unit.lessons]
              .sort((a, b) => a.order - b.order)
              .map((lesson) => (
                <li key={lesson.order} className="flex items-baseline gap-3 py-1.5">
                  <span aria-hidden="true" className="text-secondary w-8 shrink-0 text-ink-muted tabular-nums">
                    {unit.order}.{lesson.order}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-3">
                    <span className="font-read text-body min-w-0 text-ink">{lesson.title}</span>
                    <span aria-hidden="true" className="hidden min-w-4 flex-1 border-b border-dotted border-border-control sm:block" />
                    <span className="text-secondary shrink-0 text-ink-muted tabular-nums">
                      {lessonType(lesson.type)}
                      {lesson.durationMinutes === null ? null : ` · ${t('detail.minutes', { value: n(lesson.durationMinutes) })}`}
                    </span>
                  </div>
                </li>
              ))}
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

// las ediciones, en la columna fija: arriba la recomendada (la de la matrícula, si no la primera abierta, si no la primera) y debajo
// las demás. el título es para el lector de pantalla: a la vista, cada bloque lleva su etiqueta
function Offerings({ offerings, enrollments, current, firstOpen, actionInFooter }: OfferingsProps) {
  const { t } = useTranslation('catalog')
  const id = useId()
  const enrollmentIn = (offering: Offering) => enrollments.find((enrollment) => enrollment.offering.code === offering.code)
  const recommended =
    (current && offerings.find((offering) => offering.code === current.offering.code)) ??
    offerings.find((offering) => offeringState(offering) === 'open') ??
    offerings[0]
  const others = offerings.filter((offering) => offering !== recommended)
  const card = (offering: Offering, featured: boolean) => (
    <OfferingCard
      offering={offering}
      enrollment={enrollmentIn(offering)}
      current={current}
      firstOpen={firstOpen}
      actionInFooter={actionInFooter}
      featured={featured}
    />
  )
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6">
      <h2 id={id} className="sr-only">
        {t('detail.offerings')}
      </h2>
      {recommended ? (
        card(recommended, true)
      ) : (
        <Notice tone="notice" title={t('offering.none')}>
          {t('detail.noOfferingsHint')}
        </Notice>
      )}
      {others.length > 0 ? (
        <div className="flex flex-col">
          <p className="meta border-b border-ink pb-1.5">{t('detail.otherOfferings')}</p>
          <ul className="flex flex-col divide-y divide-border">
            {others.map((offering) => (
              <li key={offering.code} className="py-4">
                {card(offering, false)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

interface OfferingCardProps {
  offering: Offering
  enrollment: MyEnrollment | undefined
  current: MyEnrollment | undefined
  firstOpen: Offering | undefined
  actionInFooter: boolean
  // la recomendada: con su etiqueta, las fechas en grande y sobre la superficie con el filete de la marca
  featured: boolean
}

// las fechas de una edición son fechas civiles de su zona: se escriben en esa zona y se dice cuál es
function OfferingCard({ offering, enrollment, current, firstOpen, actionInFooter, featured }: OfferingCardProps) {
  const { t, i18n } = useTranslation('catalog')
  const role = useOpenLabel('teacherRole')
  const locale = i18n.language
  const zone = offering.timeZone
  const state = offeringState(offering)
  const isPrimary = enrollment ? enrollment === current : offering === firstOpen
  return (
    <div
      data-slot={featured ? 'recommended-offering' : 'offering'}
      className={`flex flex-col gap-3 ${featured ? 'border-t-2 border-brand bg-surface px-5 pt-4 pb-5' : ''}`}
    >
      {featured ? <p className="meta">{t(enrollment ? 'detail.yourOffering' : 'offering.nextLabel')}</p> : null}
      <h3 className="flex flex-col items-start gap-2">
        <span className={featured ? 'font-read text-h3 text-ink' : 'text-h5 text-ink'}>
          {formatCivilRange(offering.startDate, offering.endDate, zone, locale)}
        </span>
        {enrollment ? (
          <StatusBadge state={enrollment.status === ACTIVE_ENROLLMENT ? 'active' : 'done'}>
            {t(enrollment.status === ACTIVE_ENROLLMENT ? 'enroll.enrolled' : 'enroll.finished')}
          </StatusBadge>
        ) : (
          <StatusBadge state={AVAILABILITY[state]}>{t(`offering.state.${state}`)}</StatusBadge>
        )}
      </h3>
      <dl className="text-secondary flex flex-col gap-1 [&_dt]:shrink-0">
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
        <p className="text-secondary text-ink-muted">{t(`detail.offeringHint.${state}`)}</p>
      )}
    </div>
  )
}

// en una columna, la razón de la página queda siempre a mano: la edición y su acción. va en el flujo, al final del artículo: se pega
// abajo al desplazar y, al llegar al final, se queda debajo del contenido en vez de taparlo
function ActionFooter({
  current,
  currentOffering,
  firstOpen
}: {
  current: MyEnrollment | undefined
  currentOffering: Offering | undefined
  firstOpen: Offering | undefined
}) {
  const { t, i18n } = useTranslation('catalog')
  const offering = current ? currentOffering : firstOpen
  return (
    <div data-slot="course-action" className="sticky bottom-0 z-10 border-t border-ink bg-surface print:hidden">
      <div className={`${screenContainer()} flex flex-wrap items-center gap-x-4 gap-y-2 py-3`}>
        {offering ? (
          <p className="flex min-w-0 flex-1 basis-40 flex-col">
            <span className="text-label text-ink">{formatCivilRange(offering.startDate, offering.endDate, offering.timeZone, i18n.language)}</span>
            <span className="text-secondary text-ink-muted">
              {current ? t(current.status === ACTIVE_ENROLLMENT ? 'enroll.enrolled' : 'enroll.finished') : t(`offering.state.${offeringState(offering)}`)}
            </span>
          </p>
        ) : null}
        {/* con el aviso de un fallo (un 409 largo), la acción toma toda la fila: el motivo no se lee en media columna */}
        <div className="min-w-0 flex-1 basis-40 has-[[role=alert]]:basis-full">
          {current ? <GoToCourse enrollmentId={current.id} /> : firstOpen ? <EnrollAction offering={firstOpen} /> : null}
        </div>
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
  // un componente sin horas, ni por semana ni en total, no tiene dato que dar: no se pinta su fila
  const rows = WORKLOAD_ROWS.filter((key) => w.weekly[key] > 0 || totals[key] > 0)
  // un encabezado de fila es un nombre, no un metadato: sin las versalitas que el tema (sin capa) pone a toda cabecera de tabla
  const rowHead = 'text-body! bg-transparent tracking-normal! text-ink [font-variant-caps:normal]!'
  return (
    <div className="flex flex-col gap-3">
      {/* sin ningún componente con horas, la tabla solo diría ceros: quedan las horas de contacto y dirigidas */}
      {rows.length > 0 ? (
        <Table className="max-w-xl tabular-nums">
          <caption className="text-secondary pb-2 text-left text-ink-muted">{t('workload.caption', { count: w.weeks })}</caption>
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
            {rows.map((key) => (
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
      ) : null}
      <dl className="text-secondary flex flex-wrap gap-x-6 gap-y-1">
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
