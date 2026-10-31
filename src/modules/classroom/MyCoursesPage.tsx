import { LoadingState, PageHeader, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ProblemState } from '../../shared/ProblemState'
import { useRefetchOnRevisit } from '../../shared/revisit'
import { useEnrollments } from './api'
import type { Enrollment } from './contract'
import { OfferingDates, ProgressBar, useProblemText } from './parts'
import { CATALOG_COURSES_ROUTE, CLASSROOM_ROUTES, LESSON_PARAM } from './routes'

// «Mis cursos»: cada matrícula activa con su avance y un solo botón, el que lleva a la siguiente lección
export function MyCoursesPage() {
  const { t } = useTranslation('classroom')
  const query = useEnrollments()
  useRefetchOnRevisit(query.refetch)
  return (
    <>
      <PageHeader title={t('enrollments.title')} subtitle={t('enrollments.subtitle')} />
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-8">
        {query.isError ? (
          <EnrollmentsProblem error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data ? (
          <EnrollmentList enrollments={query.data} />
        ) : (
          <LoadingState label={t('enrollments.loading')} />
        )}
      </div>
    </>
  )
}

function EnrollmentsProblem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('classroom')
  const { title, description } = useProblemText(error, 'enrollments')
  return (
    <ProblemState title={title} description={description}>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {t('problem.retry')}
      </Button>
    </ProblemState>
  )
}

function EnrollmentList({ enrollments }: { enrollments: Enrollment[] }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  if (enrollments.length === 0)
    return (
      <div className="flex max-w-prose flex-col items-start gap-2 py-12">
        <p className="text-base font-semibold text-ink">{t('enrollments.empty')}</p>
        <p className="text-sm text-ink-muted">{t('enrollments.emptyHint')}</p>
        {/* el catálogo es otro módulo: se enlaza por su clave de ruta, sin importarlo, y solo si está registrado */}
        {links.has(CATALOG_COURSES_ROUTE) ? (
          <Button asChild variant="secondary" size="sm" className="mt-2">
            <Link to={links.to(CATALOG_COURSES_ROUTE)}>{t('enrollments.toCatalog')}</Link>
          </Button>
        ) : null}
      </div>
    )
  return (
    <ul className="flex flex-col divide-y divide-border">
      {enrollments.map((enrollment) => (
        <li key={enrollment.id}>
          <EnrollmentItem enrollment={enrollment} />
        </li>
      ))}
    </ul>
  )
}

function EnrollmentItem({ enrollment }: { enrollment: Enrollment }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const params = { enrollmentId: enrollment.id }
  const next = enrollment.nextLesson
  const course = enrollment.course.title
  return (
    <article className="flex flex-col gap-3 py-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold leading-snug tracking-tight">
          <Link
            to={links.to(CLASSROOM_ROUTES.classroom, params)}
            className="rounded-sm text-ink underline-offset-4 hover:text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {course}
          </Link>
        </h2>
        <OfferingDates offering={enrollment.offering} />
      </div>
      {enrollment.certificateCode ? (
        <p className="flex flex-wrap gap-x-3 text-sm">
          <span className="font-medium text-success">{t('enrollments.certified')}</span>
          <Link to={links.to(CLASSROOM_ROUTES.certificate, { code: enrollment.certificateCode })} className="text-link underline-offset-4 hover:underline">
            {t('enrollments.certificate', { course })}
          </Link>
        </p>
      ) : null}
      <ProgressBar progress={enrollment.progress} label={t('progress.course')} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink">{next ? t('enrollments.next', { lesson: next.title }) : t('enrollments.finished')}</p>
        {next ? (
          <Button asChild size="sm" className="self-start sm:self-auto">
            <Link to={links.to(CLASSROOM_ROUTES.classroom, params, { [LESSON_PARAM]: next.id })} aria-label={t('enrollments.continueLabel', { course })}>
              {t('enrollments.continue')}
            </Link>
          </Button>
        ) : (
          <Button asChild variant="secondary" size="sm" className="self-start sm:self-auto">
            <Link to={links.to(CLASSROOM_ROUTES.classroom, params)} aria-label={t('enrollments.reviewLabel', { course })}>
              {t('enrollments.review')}
            </Link>
          </Button>
        )}
      </div>
    </article>
  )
}
