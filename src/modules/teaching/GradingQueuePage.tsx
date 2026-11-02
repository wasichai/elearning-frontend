import { LoadingState, useWasichaiLinks } from '@wasichai/core'
import { Button, Table, Td, Th } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { WRAP } from '../../shared/buttons'
import { Link, useParams } from 'react-router'
import { formatDateTime, formatNumber } from '../../shared/format'
import { useOfferings, useQueue } from './api'
import type { PendingAttempt } from './contract'
import { OfferingSection } from './OfferingSection'
import { EmailText, QueryProblem } from './parts'
import { TEACHING_ROUTES } from './routes'

// la cola de corrección de una edición: lo enviado que espera al docente, lo más antiguo primero
export function GradingQueuePage() {
  const { t } = useTranslation('teaching')
  const { code = '' } = useParams()
  const query = useQueue(code)
  return (
    <OfferingSection code={code} section="queue" heading={t('queue.title')}>
      {query.isError ? (
        <QueryProblem error={query.error} resource="queue" onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <LoadingState label={t('queue.loading')} />
      ) : query.data.length === 0 ? (
        <p className="py-6 text-sm text-ink-muted">{t('queue.empty')}</p>
      ) : (
        <QueueTable code={code} attempts={query.data} />
      )}
    </OfferingSection>
  )
}

function QueueTable({ code, attempts }: { code: string; attempts: PendingAttempt[] }) {
  const { t, i18n } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const locale = i18n.language
  const zone = useOfferings().data?.find((candidate) => candidate.code === code)?.timeZone
  const sorted = [...attempts].sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt))
  return (
    <div className="overflow-x-auto">
      <Table aria-label={t('queue.title')}>
        <thead>
          <tr>
            <Th scope="col">{t('queue.student')}</Th>
            <Th scope="col">{t('queue.lesson')}</Th>
            <Th scope="col">{t('queue.submittedAt')}</Th>
            <Th scope="col">{t('queue.pendingQuestions')}</Th>
            <Th scope="col">{t('queue.action')}</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((attempt) => {
            const student = attempt.email ?? t('roster.noEmail')
            return (
              <tr key={attempt.attemptId}>
                <Th scope="row" className="bg-transparent text-sm font-normal tracking-normal text-ink normal-case">
                  {attempt.email ? <EmailText email={attempt.email} /> : student}
                </Th>
                <Td>{attempt.lessonTitle}</Td>
                <Td>{formatDateTime(attempt.submittedAt, locale, zone ?? 'UTC')}</Td>
                <Td>{formatNumber(attempt.pendingQuestions, locale)}</Td>
                <Td>
                  <Button className={WRAP} asChild variant="secondary" size="sm">
                    <Link
                      to={links.to(TEACHING_ROUTES.attempt, { code, attemptId: attempt.attemptId })}
                      aria-label={t('queue.gradeLabel', { student, lesson: attempt.lessonTitle })}
                    >
                      {t('queue.grade')}
                    </Link>
                  </Button>
                </Td>
              </tr>
            )
          })}
        </tbody>
      </Table>
    </div>
  )
}
