import { LoadingState, PageHeader, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { ProblemState } from '../../shared/ProblemState'
import { useClassroom } from './api'
import type { Classroom } from './contract'
import { OfferingDates, ProgressBar, useProblemText } from './parts'
import { CLASSROOM_ROUTES } from './routes'

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

function ClassroomView({ classroom }: { classroom: Classroom }) {
  const { t } = useTranslation('classroom')
  return (
    <>
      <PageHeader title={classroom.course.title} />
      <div className="flex flex-col gap-4 px-4 py-6 sm:px-8">
        <BackToMyCourses />
        <OfferingDates offering={classroom.offering} />
        <div className="max-w-md">
          <ProgressBar progress={classroom.progress} label={t('progress.course')} />
        </div>
      </div>
    </>
  )
}
