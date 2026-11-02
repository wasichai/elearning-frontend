import { EmptyState, LoadingState } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ProblemState } from '../../shared/ProblemState'
import { useSessions } from './api'
import { CourseSubpage } from './CourseSubpage'
import { useProblemText } from './parts'
import { SessionList } from './SessionList'

// las sesiones en vivo de una matrícula (ADR-0016)
export function SessionsPage() {
  const { t } = useTranslation('classroom')
  return <CourseSubpage subtitle={t('sessions.title')}>{(classroom) => <Sessions enrollmentId={classroom.id} />}</CourseSubpage>
}

export function Sessions({ enrollmentId, lessonId }: { enrollmentId: string; lessonId?: string }) {
  const { t } = useTranslation('classroom')
  const query = useSessions(enrollmentId)
  const { title, description } = useProblemText(query.error, 'sessions')
  if (query.isError)
    return (
      <ProblemState title={title} description={description}>
        <Button variant="secondary" onClick={() => void query.refetch()}>
          {t('problem.retry')}
        </Button>
      </ProblemState>
    )
  if (!query.data) return <LoadingState label={t('sessions.loading')} />
  const sessions = lessonId ? query.data.filter((session) => session.lessonId === lessonId) : query.data
  if (sessions.length === 0)
    return lessonId ? (
      <p className="text-sm text-ink-muted">{t('sessions.noneForLesson')}</p>
    ) : (
      <EmptyState title={t('sessions.none')} icon={CalendarDays}>
        <p>{t('sessions.noneHint')}</p>
      </EmptyState>
    )
  return <SessionList enrollmentId={enrollmentId} sessions={sessions} headingLevel={lessonId ? 4 : 3} lessonLinks={!lessonId} />
}
