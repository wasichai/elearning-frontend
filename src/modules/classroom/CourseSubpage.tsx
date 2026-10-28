import { LoadingState, PageHeader, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { ProblemState } from '../../shared/ProblemState'
import { useClassroom } from './api'
import type { Classroom } from './contract'
import { useProblemText } from './parts'
import { CLASSROOM_ROUTES } from './routes'

// el marco de una página de una matrícula (sesiones, finalización): el título del curso, la vuelta al aula y el contenido.
// el aula ya está en caché si se viene de ella; si no, se lee, y su 404 es el mismo «no está en tus matrículas»
export function CourseSubpage({ subtitle, children }: { subtitle: string; children: (classroom: Classroom) => ReactNode }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const { enrollmentId = '' } = useParams()
  const query = useClassroom(enrollmentId)
  const back = (
    <Link to={links.to(CLASSROOM_ROUTES.classroom, { enrollmentId })} className="text-sm text-link underline-offset-4 hover:underline">
      {t('subpage.back')}
    </Link>
  )
  if (query.isError) return <SubpageProblem error={query.error} onRetry={() => void query.refetch()} />
  if (!query.data) return <LoadingState label={t('classroom.loading')} />
  return (
    <>
      <PageHeader title={query.data.course.title} subtitle={subtitle} />
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-6 pb-16 sm:px-8">
        {back}
        {children(query.data)}
      </div>
    </>
  )
}

function SubpageProblem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const { kind, title, description } = useProblemText(error, 'classroom')
  const toCourses = (
    <Link to={links.to(CLASSROOM_ROUTES.enrollments)} className="text-sm text-link underline-offset-4 hover:underline">
      {t('classroom.back')}
    </Link>
  )
  if (kind === 'notFound')
    return (
      <>
        <PageHeader title={t('classroom.notFound')} subtitle={t('classroom.notFoundHint')} />
        <div className="px-4 py-6 sm:px-8">{toCourses}</div>
      </>
    )
  return (
    <div className="px-4 sm:px-8">
      <ProblemState title={title} description={description}>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('problem.retry')}
        </Button>
        {toCourses}
      </ProblemState>
    </div>
  )
}
