import { LoadingState, PageHeader, useWasichaiLinks } from '@wasichai/core'
import { Button, Table, Td, Th } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { formatNumber } from '../../shared/format'
import { ProblemState } from '../../shared/ProblemState'
import { useOfferings, useRoster } from './api'
import type { RosterAssessment, RosterEntry } from './contract'
import { BackToOfferings, OfferingDates, useProblemText } from './parts'
import { TEACHING_ROUTES } from './routes'

// los matriculados de una edición asignada: su progreso, su asistencia y sus evaluaciones
export function RosterPage() {
  const { t } = useTranslation('teaching')
  const { code = '' } = useParams()
  const offerings = useOfferings()
  const offering = offerings.data?.find((candidate) => candidate.code === code)
  return (
    <>
      <PageHeader title={offering?.course.title ?? t('roster.title')} subtitle={offering ? t('roster.subtitle', { code }) : undefined} />
      <div className="flex flex-col gap-5 px-4 pt-6 pb-16 sm:px-8">
        <BackToOfferings />
        {offering ? <OfferingDates offering={offering} /> : null}
        <OfferingNav code={code} pending={offering?.pendingAttempts} />
        <Roster code={code} />
      </div>
    </>
  )
}

function OfferingNav({ code, pending }: { code: string; pending?: number }) {
  const { t, i18n } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const linkClass = 'text-sm text-link underline-offset-4 hover:underline'
  return (
    <nav aria-label={t('roster.more')} className="flex flex-wrap gap-x-6 gap-y-1">
      <Link to={links.to(TEACHING_ROUTES.queue, { code })} className={linkClass}>
        {pending ? t('roster.toQueuePending', { count: pending, value: formatNumber(pending, i18n.language) }) : t('roster.toQueue')}
      </Link>
      <Link to={links.to(TEACHING_ROUTES.sessions, { code })} className={linkClass}>
        {t('roster.toSessions')}
      </Link>
    </nav>
  )
}

function Roster({ code }: { code: string }) {
  const { t, i18n } = useTranslation('teaching')
  const query = useRoster(code)
  const { kind, title, description } = useProblemText(query.error, 'roster')
  // un 404 es una respuesta: la edición no existe o no está asignada a esta persona (el servidor no distingue)
  if (query.isError && kind === 'notFound')
    return (
      <div role="alert" className="flex max-w-prose flex-col gap-2 py-6">
        <p className="text-base font-semibold text-ink">{t('roster.notFound')}</p>
        <p className="text-sm text-ink-muted">{t('roster.notFoundHint')}</p>
      </div>
    )
  if (query.isError)
    return (
      <ProblemState title={title} description={description}>
        <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
          {t('problem.retry')}
        </Button>
      </ProblemState>
    )
  if (!query.data) return <LoadingState label={t('roster.loading')} />
  if (query.data.length === 0) return <p className="py-6 text-sm text-ink-muted">{t('roster.empty')}</p>
  const students = [...query.data].sort((a, b) => (a.email === null ? 1 : b.email === null ? -1 : a.email.localeCompare(b.email)))
  return (
    <section aria-labelledby="roster-heading" className="flex flex-col gap-3">
      <h2 id="roster-heading" className="text-lg font-semibold text-ink">
        {t('roster.heading', { count: students.length, value: formatNumber(students.length, i18n.language) })}
      </h2>
      {/* la tabla se desplaza sola en una pantalla estrecha, sin empujar la página */}
      <div className="overflow-x-auto">
        <Table aria-labelledby="roster-heading">
          <thead>
            <tr>
              <Th scope="col">{t('roster.student')}</Th>
              <Th scope="col">{t('roster.status')}</Th>
              <Th scope="col">{t('roster.progress')}</Th>
              <Th scope="col">{t('roster.attendance')}</Th>
              <Th scope="col">{t('roster.assessments')}</Th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <RosterRow key={student.enrollmentId} student={student} />
            ))}
          </tbody>
        </Table>
      </div>
    </section>
  )
}

function RosterRow({ student }: { student: RosterEntry }) {
  const { t, i18n } = useTranslation('teaching')
  const locale = i18n.language
  const { progress, attendance } = student
  return (
    <tr>
      <Th scope="row" className="font-normal break-all">
        {student.email ?? t('roster.noEmail')}
      </Th>
      <Td>{t(`roster.enrollmentStatus.${student.status}`)}</Td>
      <Td>
        {t('roster.progressValue', {
          percent: formatNumber(progress.percent, locale),
          completed: formatNumber(progress.completedLessons, locale),
          total: formatNumber(progress.totalLessons, locale)
        })}
      </Td>
      <Td>
        {attendance.total === 0
          ? t('roster.noSessions')
          : t('roster.attendanceValue', { attended: formatNumber(attendance.attended, locale), total: formatNumber(attendance.total, locale) })}
      </Td>
      <Td>
        {student.assessments.length === 0 ? (
          <span className="text-ink-muted">{t('roster.noAssessments')}</span>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {student.assessments.map((assessment) => (
              <li key={assessment.lessonId}>
                <AssessmentState assessment={assessment} />
              </li>
            ))}
          </ul>
        )}
      </Td>
    </tr>
  )
}

function AssessmentState({ assessment }: { assessment: RosterAssessment }) {
  const { t, i18n } = useTranslation('teaching')
  const state = assessment.pending
    ? t('roster.assessmentPending')
    : assessment.bestPercent === null
      ? t('roster.assessmentNone')
      : t(assessment.passed ? 'roster.assessmentPassed' : 'roster.assessmentFailed', { percent: formatNumber(assessment.bestPercent, i18n.language) })
  return (
    <span>
      <span className="text-ink">{assessment.title}</span>
      <span className={assessment.pending ? 'text-warning' : 'text-ink-muted'}>: {state}</span>
    </span>
  )
}
