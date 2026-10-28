import { LoadingState, useWasichaiConfig, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button, Table, Td, Th } from '@wasichai/ui'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { useCourse } from './api'
import type { CourseDetail, Credits, Offering } from './contract'
import { formatCivilDate, formatCivilRange, formatInstant, formatNumber, languageName, timeZoneLabel } from './format'
import { Fact, IllustrativeMark, offeringState, useOpenLabel } from './parts'
import { ProblemState, useProblemText } from './ProblemState'
import { PublicHeading, PublicLayout } from './PublicLayout'
import { CATALOG_ROUTES } from './routes'

// con más lecciones que estas, cada unidad pliega su lista: el temario se recorre por unidades sin un muro de texto
export const LONG_SYLLABUS = 12

export function CourseDetailPage() {
  const { slug = '' } = useParams()
  const query = useCourse(slug)
  return (
    <PublicLayout>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <CourseProblem error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <CourseView course={query.data} />
      )}
    </PublicLayout>
  )
}

function BackToCatalog() {
  const { t } = useTranslation('catalog')
  const links = useWasichaiLinks()
  return (
    <Link to={links.to(CATALOG_ROUTES.courses)} className="text-sm text-link underline-offset-4 hover:underline">
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
      <>
        <PublicHeading title={title} subtitle={t('detail.notFoundHint')} />
        <BackToCatalog />
      </>
    )
  return (
    <ProblemState title={title} description={description}>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {t('problem.retry')}
      </Button>
      <BackToCatalog />
    </ProblemState>
  )
}

function CourseView({ course }: { course: CourseDetail }) {
  const { t, i18n } = useTranslation('catalog')
  const { timeZone } = useWasichaiConfig()
  const locale = i18n.language
  return (
    <article>
      <PublicHeading
        title={course.title}
        subtitle={course.summary}
        eyebrow={
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
            <BackToCatalog />
            {course.category ? <span className="font-medium uppercase tracking-wide">{course.category.name}</span> : null}
            {course.illustrative ? <IllustrativeMark /> : null}
          </div>
        }
      />
      <dl className="flex flex-wrap gap-x-6 gap-y-1 border-y border-border py-3 text-sm">
        <Fact label={t('course.level')}>{t(`level.${course.level}`)}</Fact>
        <Fact label={t('course.modality')}>{t(`modality.${course.modality}`)}</Fact>
        <Fact label={t('course.duration')}>{t('course.durationValue', { count: course.weeks, hours: formatNumber(course.workload.totalHours, locale) })}</Fact>
        <Fact label={t('detail.language')}>{languageName(course.language, locale)}</Fact>
        <Fact label={t('detail.code')}>{course.code}</Fact>
        <Fact label={t('detail.version')}>
          {course.version.publishedAt
            ? t('detail.versionPublished', { number: course.version.number, date: formatInstant(course.version.publishedAt, locale, timeZone) })
            : t('detail.versionNumber', { number: course.version.number })}
        </Fact>
      </dl>

      <div className="mt-10 flex flex-col gap-12">
        {course.objectives.length + course.learningOutcomes.length > 0 ? (
          <Section title={t('detail.goals')}>
            <Lines title={t('detail.objectives')} lines={course.objectives} />
            <Lines title={t('detail.outcomes')} lines={course.learningOutcomes} />
          </Section>
        ) : null}

        {course.requirements || course.prerequisiteKnowledge ? (
          <Section title={t('detail.before')}>
            <Prose title={t('detail.prerequisiteKnowledge')} text={course.prerequisiteKnowledge} />
            <Prose title={t('detail.requirements')} text={course.requirements} />
          </Section>
        ) : null}

        <Syllabus course={course} />
        <Offerings offerings={course.offerings} />

        {course.teachers.length > 0 ? (
          <Section title={t('detail.teachers')}>
            <ul className="flex flex-col gap-4">
              {course.teachers.map((teacher) => (
                <li key={teacher.name} className="flex flex-col gap-1 text-sm">
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
          <Workload course={course} />
          <CreditsView credits={course.credits} />
        </Section>

        {course.assessment || course.certification ? (
          <Section title={t('detail.assessmentAndCertification')}>
            <Prose title={t('detail.assessment')} text={course.assessment} />
            <Prose title={t('detail.certification')} text={course.certification} />
          </Section>
        ) : null}

        {course.sources.length > 0 ? (
          <Section title={t('detail.sources')}>
            <Lines lines={course.sources} />
          </Section>
        ) : null}
      </div>
    </article>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  )
}

function Lines({ title, lines }: { title?: string; lines: string[] }) {
  if (lines.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      {title ? <h3 className="font-medium text-ink">{title}</h3> : null}
      <ul className="max-w-prose list-disc space-y-1 pl-5 text-ink">
        {lines.map((line) => (
          <li key={line}>{line}</li>
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

function Syllabus({ course }: { course: CourseDetail }) {
  const { t, i18n } = useTranslation('catalog')
  const lessonType = useOpenLabel('lessonType')
  if (course.units.length === 0) return null
  const units = [...course.units].sort((a, b) => a.order - b.order)
  const folded = units.reduce((total, unit) => total + unit.lessons.length, 0) > LONG_SYLLABUS
  return (
    <Section title={t('detail.syllabus')}>
      <ol className="flex flex-col divide-y divide-border border-y border-border">
        {units.map((unit) => {
          const lessons = (
            <ol className="flex flex-col gap-2 pt-3">
              {[...unit.lessons]
                .sort((a, b) => a.order - b.order)
                .map((lesson) => (
                  <li key={lesson.order} className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <span className="text-ink">{lesson.title}</span>
                    <span className="shrink-0 text-ink-muted">
                      {lessonType(lesson.type)} · {t('detail.minutes', { value: formatNumber(lesson.durationMinutes, i18n.language) })}
                    </span>
                  </li>
                ))}
            </ol>
          )
          return (
            <li key={unit.order} className="flex flex-col gap-1 py-4">
              <h3 className="font-medium text-ink">{t('detail.unit', { order: unit.order, title: unit.title })}</h3>
              <p className="text-sm text-ink-muted">
                {t('detail.unitMeta', { count: unit.lessons.length, hours: formatNumber(unit.estimatedHours, i18n.language) })}
              </p>
              {unit.description ? <p className="max-w-prose text-sm text-ink">{unit.description}</p> : null}
              {unit.lessons.length === 0 ? null : folded ? (
                <details>
                  <summary className="cursor-pointer text-sm text-link underline-offset-4 hover:underline">
                    {t('detail.showLessons', { count: unit.lessons.length })}
                  </summary>
                  {lessons}
                </details>
              ) : (
                lessons
              )}
            </li>
          )
        })}
      </ol>
    </Section>
  )
}

function Offerings({ offerings }: { offerings: Offering[] }) {
  const { t } = useTranslation('catalog')
  return (
    <Section title={t('detail.offerings')}>
      {offerings.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('offering.none')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {offerings.map((offering) => (
            <li key={offering.code} className="py-4">
              <OfferingView offering={offering} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

// las fechas de una edición son fechas civiles de su zona: se escriben en esa zona y se dice cuál es
function OfferingView({ offering }: { offering: Offering }) {
  const { t, i18n } = useTranslation('catalog')
  const role = useOpenLabel('teacherRole')
  const locale = i18n.language
  const zone = offering.timeZone
  const state = offeringState(offering)
  return (
    <div className="flex flex-col gap-2 text-sm">
      <h3 className="flex flex-wrap items-baseline gap-x-3 font-medium text-ink">
        <span>{formatCivilRange(offering.startDate, offering.endDate, zone, locale)}</span>
        <span className={state === 'open' ? 'text-success' : 'font-normal text-ink-muted'}>{t(`offering.state.${state}`)}</span>
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
        <summary className="cursor-pointer text-link underline-offset-4 hover:underline">{t('credits.how')}</summary>
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
